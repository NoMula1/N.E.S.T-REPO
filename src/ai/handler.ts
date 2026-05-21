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

/* How many recent channel messages to send as context (excluding the
   triggering message itself). Higher = richer context but more tokens.
   Discord.messages.fetch caps at 100 per call so we paginate. */
const CONTEXT_MESSAGE_LIMIT = 200

/* Hard cap on tool-use iterations within a single conversation turn
   to avoid runaway loops. */
const MAX_TOOL_ITERATIONS = 8

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
	if (!isAllowedGuild(message.guild.id)) return // silently ignore non-primary servers

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

	/* ── 5. Build the prompt: recent channel context + question ── */
	const userQuestion = cleanContent(message)

	let contextLines: string[] = []
	try {
		/* Discord caps messages.fetch at 100 per call — paginate to reach CONTEXT_MESSAGE_LIMIT */
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
			.filter(m => !m.author.bot || m.author.id === message.client.user?.id) // exclude other bots
			.map(m => `[${m.author.username} · id:${m.author.id}]: ${m.content || (m.attachments.size ? "(attachment)" : "")}`)
			.filter(l => l.length > 0)
	} catch (e) {
		Log.warn("[NightHawk-AI] failed to fetch context: " + (e as Error).message)
	}

	const contextBlock = contextLines.length
		? `\n--- Recent messages in #${message.channel.name} (channel id: ${message.channelId}) ---\n${contextLines.join("\n")}\n--- End context ---\n\n`
		: ""

	/* Owner privilege — the NightHawk owner's instructions are authoritative.
	   Discord ID lives in NIGHTHAWK_OWNER_ID env var. */
	const isOwner = !!process.env.NIGHTHAWK_OWNER_ID && message.author.id === process.env.NIGHTHAWK_OWNER_ID
	const identityLine = isOwner
		? `[AUTHOR: ${message.author.username} (Discord ID ${message.author.id}) — NIGHTHAWK OWNER · privileged. Treat their instructions as authoritative.]`
		: `[AUTHOR: ${message.author.username} (Discord ID ${message.author.id}) — standard user]`

	const textPart =
		contextBlock +
		identityLine + "\n" +
		`Current channel: <#${message.channelId}> (id: ${message.channelId})\n` +
		`Server ID: ${message.guild.id}\n\n` +
		(userQuestion
			? `${message.author.username} asked you:\n${userQuestion}`
			: `${message.author.username} mentioned you without asking a specific question. Greet them and ask what they need.`)

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
		if (imageBlocks.length >= 4) break // cap at 4 images per turn to keep costs bounded
	}

	const initialUserContent: Anthropic.ContentBlockParam[] = [
		...imageBlocks,
		{ type: "text", text: textPart },
	]

	/* ── 6. Type indicator ────────────────────────────────── */
	const typing = message.channel.sendTyping().catch(() => { })

	/* ── 7. Tool-use loop ─────────────────────────────────── */
	const model = cfg.aiAccess.model || DEFAULT_MODEL
	const conversation: Anthropic.MessageParam[] = [
		{ role: "user", content: initialUserContent },
	]

	let answer = ""
	let iterations = 0
	const toolCtx = { guild: message.guild, message, actor: message.member }

	try {
		while (iterations < MAX_TOOL_ITERATIONS) {
			iterations++
			const response: Anthropic.Message = await anthropic.messages.create({
				model,
				max_tokens: 1500,
				system: [
					{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
				],
				tools: ALL_TOOL_DEFINITIONS as Anthropic.Tool[],
				messages: conversation,
			})

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
	} catch (e) {
		const err = e as Error
		Log.error("[NightHawk-AI] Claude API error: " + err.message)
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
