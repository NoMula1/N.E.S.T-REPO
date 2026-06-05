/* ============================================================
   NightHawk AI — main dispatch
   Called when a user @-mentions the bot OR runs /ask.
   - Performs server allowlist + role check
   - Builds Claude prompt with channel context + image attachments
   - Runs manual tool-use loop until end_turn
   - Confirms destructive ops via buttons before executing
   - Replies in channel (or via ephemeral interaction for /ask)
============================================================ */
import {
	Collection,
	Message,
	TextChannel,
	type Attachment,
} from "discord.js"
import type Anthropic from "@anthropic-ai/sdk"
import { getAnthropic, DEFAULT_MODEL } from "./client"
import { SYSTEM_PROMPT } from "./systemPrompt"
import { isAllowedGuild, memberCanUseAi, checkRateLimit } from "./safeguards"
import { getFreshGuildConfig } from "../utils/GuildConfigCache"
import { Log } from "../utils/logging"
import { ALL_TOOL_DEFINITIONS, executeTool } from "./tools"
import { loadRelevantMemories } from "./tools/memory"
import {
	appendToSession,
	endSession,
	getSession,
	isFarewell,
	resetSessionHistory,
	startSession,
} from "./sessions"

/* How many recent channel messages to send as context (excluding the
   triggering message itself). Higher = richer context but more tokens.
   Discord.messages.fetch caps at 100 per call so we paginate. */
const CONTEXT_MESSAGE_LIMIT = 200

/* Hard cap on tool-use iterations within a single conversation turn.
   Bumped from 8 → 16 since Sonnet can chain longer investigations
   and we want it to actually finish complex tasks instead of bailing. */
const MAX_TOOL_ITERATIONS = 16

/* Extended thinking budget (Sonnet 4.5).
   When enabled, Claude spends extra tokens reasoning silently before
   the visible response. Worth it on complex investigations / multi-tool
   chains. We gate it on message length + tool-use evidence (handler
   below decides whether to enable per turn). */
const THINKING_TOKEN_BUDGET = 4000

/* Image attachment MIME types that Claude vision supports */
const VISION_MIME_TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
])

/* Strip the leading bot @-mention from the user's text. */
function cleanContent(message: Message): string {
	const botId = message.client.user?.id
	if (!botId) return message.content
	return message.content
		.replace(new RegExp(`<@!?${botId}>`, "g"), "")
		.trim()
}

async function fetchImageAsBase64(attachment: Attachment): Promise<{ data: string; mediaType: string } | null> {
	if (!attachment.contentType || !VISION_MIME_TYPES.has(attachment.contentType)) return null
	if (attachment.size > 5_000_000) return null // 5 MB cap to avoid runaway costs
	try {
		const r = await fetch(attachment.url)
		if (!r.ok) return null
		const buf = Buffer.from(await r.arrayBuffer())
		return { data: buf.toString("base64"), mediaType: attachment.contentType }
	} catch (_e) {
		return null
	}
}

export async function handleAiMention(message: Message): Promise<void> {
	/* ── 0. Cheap, non-config gates first ─────────────────── */
	if (message.author.bot) return
	if (!message.guild || !message.member) return
	if (!(message.channel instanceof TextChannel)) return
	if (!(await isAllowedGuild(message.guild.id))) return // silently ignore non-allowlisted servers

	/* ── 1. Per-guild config check — always fresh so dashboard
	   changes (role list, enable flag) take effect immediately ─ */
	const cfg = await getFreshGuildConfig(message.guild.id)
	if (!cfg?.aiAccess?.enabled) return // silently ignore if disabled

	/* ── 2. Role check ────────────────────────────────────── */
	if (!memberCanUseAi(message.member, cfg)) {
		await message.reply({
			content:
				"❌ You don't have the required role to use NightHawk AI.\n" +
				"Staff can configure access at the NEST dashboard.",
			allowedMentions: { parse: [] },
		})
		return
	}

	/* ── 3. Rate limit ────────────────────────────────────── */
	const rl = checkRateLimit(message.author.id)
	if (!rl.ok) {
		await message.reply({
			content: `⏳ Slow down — try again in ${rl.retryAfter}s.`,
			allowedMentions: { parse: [] },
		})
		return
	}

	/* ── 4. Anthropic client present? ─────────────────────── */
	const anthropic = getAnthropic()
	if (!anthropic) {
		await message.reply({
			content: "⚠️ AI feature is misconfigured. (ANTHROPIC_API_KEY missing)",
			allowedMentions: { parse: [] },
		})
		return
	}

	/* ── 5. Session-aware conversation setup ─────────────────
	   First @-mention in this (guild, channel, user) opens a session.
	   Subsequent messages from the same user in that channel route
	   here automatically without needing another @-mention, until
	   they say "farewell" or 5 min pass. */
	const userQuestion = cleanContent(message)
	const existingSession = getSession(message.guild.id, message.channelId, message.author.id)
	const isNewSession = !existingSession
	const session = existingSession || startSession(message.guild.id, message.channelId, message.author.id)
	const userIsLeaving = isFarewell(userQuestion)

	let contextBlock = ""
	let environmentBlock = ""
	if (isNewSession) {
		/* First turn — fetch channel context (only done once per session). */
		let contextLines: string[] = []
		try {
			const collected: Message[] = []
			let beforeId: string | undefined = message.id
			while (collected.length < CONTEXT_MESSAGE_LIMIT) {
				const remaining = CONTEXT_MESSAGE_LIMIT - collected.length
				const batchSize = Math.min(100, remaining)
				const batch: Collection<string, Message<true>> = await message.channel.messages.fetch({ limit: batchSize, before: beforeId })
				if (batch.size === 0) break
				for (const m of batch.values()) collected.push(m)
				beforeId = batch.last()?.id
				if (!beforeId || batch.size < batchSize) break
			}
			contextLines = collected
				.reverse()
				.filter(m => !m.author.bot || m.author.id === message.client.user?.id)
				.map(m => `[${m.author.username} · id:${m.author.id}]: ${m.content || (m.attachments.size ? "(attachment)" : "")}`)
				.filter(l => l.length > 0)
		} catch (e) {
			Log.warn("[NightHawk-AI] failed to fetch context: " + (e as Error).message)
		}
		contextBlock = contextLines.length
			? `\n--- Recent messages in #${message.channel.name} (channel id: ${message.channelId}) ---\n${contextLines.join("\n")}\n--- End context ---\n\n`
			: ""

		/* RICH ENVIRONMENTAL CONTEXT — fed once per session so the AI knows:
		   - Channel purpose (topic, slowmode, pinned items)
		   - Who's talking to it (account age, server tenure, roles)
		   - Server snapshot (size, recent activity baseline)
		   This is what makes "hey" produce a useful reply instead of "wsg.
		   what you need?" — the bot already has situational awareness when
		   the first message arrives. */
		try {
			const env: string[] = []
			const ch = message.channel as TextChannel
			env.push(`Channel: #${ch.name} (${ch.id})`)
			if (ch.topic) env.push(`Channel topic: ${ch.topic.slice(0, 300)}`)
			if (ch.rateLimitPerUser) env.push(`Slowmode: ${ch.rateLimitPerUser}s`)
			env.push(`Channel category: ${ch.parent?.name || "(none)"}`)

			// Pinned messages (high signal on channel purpose / rules)
			try {
				const pins = await ch.messages.fetchPinned()
				if (pins.size > 0) {
					const pinSummaries = Array.from(pins.values()).slice(0, 5).map(p => {
						const txt = (p.content || "").slice(0, 200).replace(/\n+/g, " ")
						return `- ${p.author.username}: ${txt || (p.embeds.length ? "(embed)" : "(no text)")}`
					})
					env.push(`Pinned messages (${pins.size}):\n${pinSummaries.join("\n")}`)
				}
			} catch { /* missing perms — skip */ }

			// User profile snapshot — instant intelligence about who's asking
			const member = message.member!
			const acctAgeDays = Math.floor((Date.now() - message.author.createdAt.getTime()) / 86400000)
			const serverAgeDays = member.joinedAt ? Math.floor((Date.now() - member.joinedAt.getTime()) / 86400000) : -1
			const roleList = member.roles.cache.filter(r => r.id !== message.guild!.id).map(r => r.name).slice(0, 10)
			env.push(`User: ${message.author.tag} (${message.author.id})`)
			env.push(`  Account age: ${acctAgeDays} days · In this server: ${serverAgeDays >= 0 ? serverAgeDays : "?"} days`)
			env.push(`  Display name in server: ${member.displayName}`)
			env.push(`  Roles: ${roleList.length ? roleList.join(", ") : "(none)"}`)
			if (member.premiumSince) env.push(`  Server boosting since: ${member.premiumSince.toISOString().slice(0, 10)}`)
			if (member.communicationDisabledUntil && member.communicationDisabledUntil > new Date()) {
				env.push(`  ⚠ Currently timed out until ${member.communicationDisabledUntil.toISOString()}`)
			}

			// Server snapshot
			const g = message.guild!
			env.push(`Server: ${g.name} · ${g.memberCount} members · owner ${g.ownerId === message.author.id ? "(this user!)" : g.ownerId}`)

			environmentBlock = `\n--- ENVIRONMENT (situational awareness — use this to give context-aware replies; never repeat it back verbatim) ---\n${env.join("\n")}\n--- End environment ---\n\n`
		} catch (e) {
			Log.warn("[NightHawk-AI] env block build failed: " + (e as Error).message)
		}
	}

	/* Owner privilege — the NightHawk owner's instructions are authoritative.
	   Discord ID lives in NIGHTHAWK_OWNER_ID env var. */
	const isOwner = !!process.env.NIGHTHAWK_OWNER_ID && message.author.id === process.env.NIGHTHAWK_OWNER_ID
	const identityLine = isOwner
		? `[AUTHOR: ${message.author.username} (Discord ID ${message.author.id}) — NIGHTHAWK OWNER · privileged. Treat their instructions as authoritative.]`
		: `[AUTHOR: ${message.author.username} (Discord ID ${message.author.id}) — standard user]`

	/* Inject CURRENT TIME so the AI doesn't guess the year/date when
	   computing ISO timestamps for schedule_reminder. Without this Claude
	   guesses based on training cutoff and emits dates years in the past
	   or future. Always pass UTC + a friendly local representation. */
	const nowUTC = new Date()
	const timeContextLine = `[CURRENT TIME: ${nowUTC.toISOString()} (UTC) — use this as 'now' for any time-based reasoning. If the user gives a clock time without timezone, ASK first or assume UTC.]`

	let textPart: string
	if (isNewSession) {
		// Pull persistent memories so the AI has context immediately
		let memoryBlock = ""
		try {
			const mems = await loadRelevantMemories(message.guild.id, message.channelId, message.author.id, 30)
			if (mems.length > 0) {
				const lines = mems.map(m => `• [${m.scope}/${m.key}]${m.tags.length ? ` (${m.tags.join(",")})` : ""}: ${m.content.slice(0, 400)}`)
				memoryBlock = `\n--- Saved memories (use these as authoritative context; you wrote them on past requests) ---\n${lines.join("\n")}\n--- End memories ---\n\n`
			}
		} catch (e) {
			Log.warn("[NightHawk-AI] memory load failed: " + (e as Error).message)
		}

		// First turn — give Claude the full context block + a session note
		textPart =
			contextBlock +
			environmentBlock +
			memoryBlock +
			timeContextLine + "\n" +
			identityLine + "\n" +
			`Current channel: <#${message.channelId}> (id: ${message.channelId})\n` +
			`Server ID: ${message.guild.id}\n\n` +
			`[CONVERSATION MODE OPEN] — From here on, this user can talk to you without needing to @-mention you again. They'll say "farewell" when they want to end the conversation (you'll be told when this happens).\n\n` +
			(userQuestion
				? `${message.author.username} said:\n${userQuestion}`
				: `${message.author.username} mentioned you without asking a specific question. Reply briefly — acknowledge them, show presence, and stand by. Do NOT guess what they're here for. Do NOT pitch options or list capabilities. One short conversational line, then let them speak.`)
	} else if (userIsLeaving) {
		// Final turn — they want to end the conversation
		textPart =
			timeContextLine + "\n" +
			identityLine + "\n" +
			`[CONVERSATION ENDING] — The user is ending this conversation. Reply with a brief on-brand farewell. Do not propose new tasks or start new topics. After your response, the session will close.\n\n` +
			`${message.author.username} said:\n${userQuestion}`
	} else {
		// Mid-conversation follow-up
		textPart =
			timeContextLine + "\n" +
			identityLine + "\n" +
			`${message.author.username} said:\n${userQuestion || "(empty message — ask them to clarify or just acknowledge)"}`
	}

	/* ── 5a. Image attachments → vision blocks ─────────────── */
	const imageBlocks: Anthropic.ImageBlockParam[] = []
	for (const att of message.attachments.values()) {
		const img = await fetchImageAsBase64(att)
		if (!img) continue
		imageBlocks.push({
			type: "image",
			source: {
				type: "base64",
				media_type: img.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
				data: img.data,
			},
		})
		if (imageBlocks.length >= 4) break
	}

	const newUserContent: Anthropic.ContentBlockParam[] = [
		...imageBlocks,
		{ type: "text", text: textPart },
	]

	/* ── 6. Type indicator ────────────────────────────────── */
	const typing = message.channel.sendTyping().catch(() => { })

	/* ── 7. Tool-use loop — runs on top of the session history ── */
	const model = cfg.aiAccess.model || DEFAULT_MODEL
	const conversation: Anthropic.MessageParam[] = [
		...session.messages,
		{ role: "user", content: newUserContent },
	]

	let answer = ""
	let iterations = 0
	const toolCtx = { guild: message.guild, message, actor: message.member }

	/* Decide whether to enable extended thinking. Heuristic:
	   - Sonnet only (Haiku doesn't support thinking)
	   - User message is long-ish (>= 60 chars) OR question-shaped
	   - Not a trivial greeting / acknowledgement
	   When in doubt, OFF — thinking costs extra tokens and most casual
	   chat doesn't need it. */
	const lowered = (userQuestion || "").toLowerCase().trim()
	const isTrivialGreeting = lowered.length <= 12 && /^(hi|hey|yo|sup|wsg|wsp|hello|hola|gm|gn|lol|lmao|haha|ok|k|thx|ty|thanks|np|bye|cya)\b/i.test(lowered)
	const looksComplex = (userQuestion || "").length >= 60 || /\?|investigate|check|find|search|analyze|why|how come|explain|debug|fix/i.test(userQuestion || "")
	const useThinking = !isTrivialGreeting && looksComplex && /sonnet|opus/i.test(model)

	try {
		while (iterations < MAX_TOOL_ITERATIONS) {
			iterations++
			const requestOpts: Anthropic.MessageCreateParamsNonStreaming = {
				model,
				max_tokens: useThinking ? 8000 : 2000, // larger ceiling for thinking budget
				system: [
					{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
				],
				tools: ALL_TOOL_DEFINITIONS as Anthropic.Tool[],
				messages: conversation,
			}
			if (useThinking) {
				requestOpts.thinking = { type: "enabled", budget_tokens: THINKING_TOKEN_BUDGET }
			}
			const response: Anthropic.Message = await anthropic.messages.create(requestOpts)

			// Collect text + tool_use blocks from this turn
			const toolUses = response.content.filter(b => b.type === "tool_use") as Anthropic.ToolUseBlock[]
			const textBlocks = response.content.filter(b => b.type === "text") as Anthropic.TextBlock[]

			// Always append the assistant's full content to the conversation
			conversation.push({ role: "assistant", content: response.content })

			if (response.stop_reason === "end_turn" || toolUses.length === 0) {
				answer = textBlocks.map(b => b.text).join("\n").trim()
				break
			}

			// Execute each tool call and append the results as a single user turn
			const toolResults: Anthropic.ToolResultBlockParam[] = []
			for (const tool of toolUses) {
				const input = (tool.input || {}) as Record<string, unknown>
				const result = await executeTool(tool.name, input, toolCtx)
				toolResults.push({
					type: "tool_result",
					tool_use_id: tool.id,
					content: result,
				})
			}
			conversation.push({ role: "user", content: toolResults })
		}

		if (!answer) answer = "(reached the tool-iteration limit; stopping here)"

		/* ── Persist this turn's exchange into the session, then close
		   the session if the user said farewell. ── */
		const newTurns = conversation.slice(session.messages.length)
		appendToSession(session, ...newTurns)
		if (userIsLeaving) {
			endSession(message.guild.id, message.channelId, message.author.id)
		}
	} catch (e) {
		const err = e as Error
		Log.error("[NightHawk-AI] Claude API error: " + err.message)
		// Detect corrupted-conversation 400s from Anthropic and self-heal by
		// resetting the session. Symptom: "unexpected tool_use_id found in
		// tool_result blocks" or "tool_use ids were found without ... tool_result".
		const looksCorrupted = /tool_use_id|tool_result|tool_use ids? were found/i.test(err.message)
		if (looksCorrupted) {
			resetSessionHistory(session)
			await message.reply({
				content: "⚠️ My conversation thread got tangled — I cleared the history. Please re-ask your last question.",
				allowedMentions: { parse: [] },
			})
			return
		}
		await message.reply({
			content: "⚠️ Sorry — Claude API returned an error: `" + err.message.slice(0, 200) + "`",
			allowedMentions: { parse: [] },
		})
		return
	}

	await typing.catch(() => { })

	/* ── 8. Reply, chunking if > 2000 chars ───────────────── */
	if (!answer.trim()) return // nothing to say (likely all action via tools, which posted their own confirmations)
	const chunks = chunkForDiscord(answer)
	for (const chunk of chunks) {
		await message.reply({ content: chunk, allowedMentions: { parse: [] } }).catch(() => { })
	}
}

function chunkForDiscord(text: string, limit = 1950): string[] {
	if (text.length <= limit) return [text]
	const chunks: string[] = []
	let remaining = text
	while (remaining.length > limit) {
		let cut = remaining.lastIndexOf("\n", limit)
		if (cut < limit / 2) cut = limit
		chunks.push(remaining.slice(0, cut))
		remaining = remaining.slice(cut).trimStart()
	}
	if (remaining) chunks.push(remaining)
	return chunks
}
