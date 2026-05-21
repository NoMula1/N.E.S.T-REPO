/* ============================================================
   NightHawk AI — DM dispatch.
   Fires when an allowed user DMs the bot directly.
   - Gated by aiAccess.dmEnabled + dmAllowedUserIds on the
     primary NightHawk hub guild (NIGHTHAWK_GUILD_ID).
   - Server-management tools are unavailable (no guild context);
     only DM-safe tools are exposed: scheduling (reminders, lists,
     cancel/pause/resume).
   - Sessions are per-user (no channel/guild scoping).
============================================================ */
import {
	Collection,
	DMChannel,
	Message,
	type Attachment,
} from "discord.js"
import type Anthropic from "@anthropic-ai/sdk"
import { getAnthropic, DEFAULT_MODEL } from "./client"
import { DM_SYSTEM_PROMPT } from "./systemPrompt"
import { userCanUseAiInDm, checkRateLimit } from "./safeguards"
import { getFreshGuildConfig } from "../utils/GuildConfigCache"
import { Log } from "../utils/logging"
import { SCHEDULING_TOOL_DEFINITIONS, executeSchedulingTool } from "./tools/scheduling"
import { MEMORY_TOOL_DEFINITIONS, executeMemoryTool, loadRelevantMemories } from "./tools/memory"
import {
	appendToSession,
	endSession,
	getSession,
	isFarewell,
	resetSessionHistory,
	startSession,
} from "./sessions"

const CONTEXT_MESSAGE_LIMIT = 50    // smaller for DMs (less noise)
const MAX_TOOL_ITERATIONS = 6

/* DMs key on a virtual ("dm", "dm-{userId}", userId) tuple so the session
   store doesn't need to know about DMs specifically. */
const DM_VIRTUAL_GUILD = "dm"
const dmChannelKey = (userId: string) => `dm-${userId}`

const VISION_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"])

async function fetchImageAsBase64(attachment: Attachment): Promise<{ data: string; mediaType: string } | null> {
	if (!attachment.contentType || !VISION_MIME_TYPES.has(attachment.contentType)) return null
	if (attachment.size > 5_000_000) return null
	try {
		const r = await fetch(attachment.url)
		if (!r.ok) return null
		const buf = Buffer.from(await r.arrayBuffer())
		return { data: buf.toString("base64"), mediaType: attachment.contentType }
	} catch {
		return null
	}
}

/* Synthetic context shape we hand to the scheduling tool executor.
   The tools only read guild.id (for the DB row's guildId field) and
   actor.id / actor.user.tag. They never call any of the heavier
   GuildMember methods (.permissions etc.) in scheduling paths that
   aren't admin-gated. For DM use we mark guild.id with the hub guild
   so listings stay in the same namespace. */
function buildDmCtx(message: Message, hubGuildId: string) {
	return {
		guild: { id: hubGuildId, channels: { fetch: async () => null } } as unknown as import("discord.js").Guild,
		message,
		actor: {
			id: message.author.id,
			user: message.author,
			permissions: { has: () => false } as unknown as import("discord.js").PermissionsBitField,
		} as unknown as import("discord.js").GuildMember,
	}
}

export async function handleAiDm(message: Message): Promise<void> {
	if (message.author.bot) return
	if (message.guild) return // safety — only DMs reach here
	if (!(message.channel instanceof DMChannel)) return

	const hubGuildId = process.env.NIGHTHAWK_GUILD_ID
	if (!hubGuildId) {
		Log.warn("[NightHawk-AI/DM] NIGHTHAWK_GUILD_ID not set — DM mode disabled")
		return
	}

	const cfg = await getFreshGuildConfig(hubGuildId)
	if (!userCanUseAiInDm(message.author.id, cfg)) {
		// Silent ignore for non-allowed DMs (avoid revealing who is allowed)
		return
	}

	const rl = checkRateLimit(message.author.id)
	if (!rl.ok) {
		await message.reply({ content: `⏳ Slow down — try again in ${rl.retryAfter}s.` }).catch(() => {})
		return
	}

	const anthropic = getAnthropic()
	if (!anthropic) {
		await message.reply({ content: "⚠️ AI feature is misconfigured (ANTHROPIC_API_KEY missing)." }).catch(() => {})
		return
	}

	const userQuestion = message.content.trim()
	const session = getSession(DM_VIRTUAL_GUILD, dmChannelKey(message.author.id), message.author.id)
		|| startSession(DM_VIRTUAL_GUILD, dmChannelKey(message.author.id), message.author.id)
	const isNewSession = session.messages.length === 0
	const userIsLeaving = isFarewell(userQuestion)

	/* DM context: small lookback so Claude sees recent exchanges if the
	   session expired between turns. */
	let contextBlock = ""
	let memoryBlock = ""
	if (isNewSession) {
		try {
			const batch: Collection<string, Message> = await message.channel.messages.fetch({ limit: CONTEXT_MESSAGE_LIMIT, before: message.id })
			const lines = Array.from(batch.values()).reverse()
				.filter(m => !m.author.bot || m.author.id === message.client.user?.id)
				.map(m => `[${m.author.username}]: ${m.content || (m.attachments.size ? "(attachment)" : "")}`)
				.filter(l => l.length > 0)
			contextBlock = lines.length ? `\n--- Recent DM history ---\n${lines.join("\n")}\n--- End ---\n\n` : ""
		} catch (e) {
			Log.warn("[NightHawk-AI/DM] failed to fetch DM context: " + (e as Error).message)
		}

		// Persistent memories — only user-scope is meaningful in DM (no channel/server context)
		try {
			const mems = await loadRelevantMemories(hubGuildId, null, message.author.id, 30)
			if (mems.length > 0) {
				const lines = mems.map(m => `• [${m.scope}/${m.key}]${m.tags.length ? ` (${m.tags.join(",")})` : ""}: ${m.content.slice(0, 400)}`)
				memoryBlock = `\n--- Saved memories (use these as authoritative context; you wrote them on past requests) ---\n${lines.join("\n")}\n--- End memories ---\n\n`
			}
		} catch (e) {
			Log.warn("[NightHawk-AI/DM] memory load failed: " + (e as Error).message)
		}
	}

	const identityLine = `[AUTHOR: ${message.author.username} (Discord ID ${message.author.id}) — DM session, no server context]`
	const acctAgeDays = Math.floor((Date.now() - message.author.createdAt.getTime()) / 86400000)
	const environmentBlock = `\n--- ENVIRONMENT (DM context) ---\nUser: ${message.author.tag} (${message.author.id})\n  Account age: ${acctAgeDays} days\n  Allowlisted for DM access (verified at handler entry).\nMode: Private DM — no guild tools available. Scheduling + memory tools work fine.\n--- End environment ---\n\n`
	const nowUTC = new Date()
	const timeContextLine = `[CURRENT TIME: ${nowUTC.toISOString()} (UTC) — use this as 'now' for any time-based reasoning. For 'in 1 minute', add 60 seconds to this. If the user gives a clock time without timezone, ASK first or assume UTC.]`
	let textPart: string
	if (isNewSession) {
		textPart =
			contextBlock +
			environmentBlock +
			memoryBlock +
			timeContextLine + "\n" +
			identityLine + "\n\n" +
			`[DM CONVERSATION MODE OPEN] — This is a private DM. There is no Discord server context. Tools that require a server (channel management, moderation, audit log, etc.) are UNAVAILABLE. You CAN: schedule reminders, list/manage their schedules, save/recall/forget memories, chat. They'll say "farewell" to end.\n\n` +
			(userQuestion
				? `${message.author.username} said:\n${userQuestion}`
				: `${message.author.username} DM'd you without saying anything specific. Reply briefly — acknowledge, show presence, stand by. Do NOT guess intent. Do NOT pitch options or surface saved notes preemptively. One short line.`)
	} else if (userIsLeaving) {
		textPart =
			timeContextLine + "\n" +
			identityLine + "\n" +
			`[DM ENDING] — Brief on-brand farewell. Don't start new topics.\n\n${message.author.username} said:\n${userQuestion}`
	} else {
		textPart =
			timeContextLine + "\n" +
			identityLine + "\n" +
			`${message.author.username} said:\n${userQuestion || "(empty message — ask them to clarify or just acknowledge)"}`
	}

	/* Vision in DMs — same path as channel mention */
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

	const typing = message.channel.sendTyping().catch(() => {})

	const conversation: Anthropic.MessageParam[] = [
		...session.messages,
		{ role: "user", content: newUserContent },
	]

	const dmCtx = buildDmCtx(message, hubGuildId)
	const model = cfg?.aiAccess?.model || DEFAULT_MODEL

	/* DM tool registry — scheduling + memory (no guild-required tools).
	   - schedule_announcement excluded (needs a channel)
	   - list_server_schedules excluded (dashboard's job)
	   - memory tools all available — user-scope is the dominant use */
	const dmTools = [
		...SCHEDULING_TOOL_DEFINITIONS.filter(t =>
			t.name === "schedule_reminder" ||
			t.name === "list_my_schedules" ||
			t.name === "cancel_schedule" ||
			t.name === "pause_schedule" ||
			t.name === "resume_schedule"
		),
		...MEMORY_TOOL_DEFINITIONS,
	]
	const memoryToolNames = new Set(MEMORY_TOOL_DEFINITIONS.map(t => t.name))

	let answer = ""
	let iterations = 0

	// Extended-thinking heuristic — same as channel handler
	const lowered = (userQuestion || "").toLowerCase().trim()
	const isTrivialGreeting = lowered.length <= 12 && /^(hi|hey|yo|sup|wsg|wsp|hello|hola|gm|gn|lol|lmao|haha|ok|k|thx|ty|thanks|np|bye|cya)\b/i.test(lowered)
	const looksComplex = (userQuestion || "").length >= 60 || /\?|investigate|check|find|search|analyze|why|how come|explain|debug|fix/i.test(userQuestion || "")
	const useThinking = !isTrivialGreeting && looksComplex && /sonnet|opus/i.test(model)

	try {
		while (iterations < MAX_TOOL_ITERATIONS) {
			iterations++
			const requestOpts: Anthropic.MessageCreateParamsNonStreaming = {
				model,
				max_tokens: useThinking ? 8000 : 2000,
				system: [
					{ type: "text", text: DM_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
				],
				tools: dmTools as Anthropic.Tool[],
				messages: conversation,
			}
			if (useThinking) {
				requestOpts.thinking = { type: "enabled", budget_tokens: 4000 }
			}
			const response: Anthropic.Message = await anthropic.messages.create(requestOpts)

			const toolUses = response.content.filter(b => b.type === "tool_use") as Anthropic.ToolUseBlock[]
			const textBlocks = response.content.filter(b => b.type === "text") as Anthropic.TextBlock[]
			conversation.push({ role: "assistant", content: response.content })

			if (response.stop_reason === "end_turn" || toolUses.length === 0) {
				answer = textBlocks.map(b => b.text).join("\n").trim()
				break
			}

			const toolResults: Anthropic.ToolResultBlockParam[] = []
			for (const tool of toolUses) {
				const input = (tool.input || {}) as Record<string, unknown>
				const result = memoryToolNames.has(tool.name)
					? await executeMemoryTool(tool.name, input, dmCtx).catch(e => `Error: ${(e as Error).message}`)
					: await executeSchedulingTool(tool.name, input, dmCtx).catch(e => `Error: ${(e as Error).message}`)
				toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: result })
			}
			conversation.push({ role: "user", content: toolResults })
		}

		if (!answer) answer = "(reached the tool-iteration limit)"

		const newTurns = conversation.slice(session.messages.length)
		appendToSession(session, ...newTurns)
		if (userIsLeaving) endSession(DM_VIRTUAL_GUILD, dmChannelKey(message.author.id), message.author.id)
	} catch (e) {
		const err = e as Error
		Log.error("[NightHawk-AI/DM] Claude API error: " + err.message)
		const looksCorrupted = /tool_use_id|tool_result|tool_use ids? were found/i.test(err.message)
		if (looksCorrupted) {
			resetSessionHistory(session)
			await message.reply({ content: "⚠️ My conversation thread got tangled — I cleared the history. Please re-ask your last question." }).catch(() => {})
			return
		}
		await message.reply({ content: "⚠️ Sorry — Claude API error: `" + err.message.slice(0, 200) + "`" }).catch(() => {})
		return
	}

	await typing.catch(() => {})

	if (!answer.trim()) return
	const chunks = chunkForDiscord(answer)
	for (const chunk of chunks) {
		await message.reply({ content: chunk }).catch(() => {})
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
