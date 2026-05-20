/* ============================================================
   NightHawk AI — main dispatch
   Called when a user @-mentions the bot. Performs gating, builds
   the prompt with recent channel context, calls Claude, replies.
============================================================ */
import { Message, TextChannel } from "discord.js"
import { getAnthropic, DEFAULT_MODEL } from "./client"
import { SYSTEM_PROMPT } from "./systemPrompt"
import { isAllowedGuild, memberCanUseAi, checkRateLimit } from "./safeguards"
import { getFreshGuildConfig } from "../utils/GuildConfigCache"
import { Log } from "../utils/logging"

/* How many recent channel messages to send as context (excluding the
   triggering message itself). Keeps token spend predictable. */
const CONTEXT_MESSAGE_LIMIT = 25

/* Strip the leading bot @-mention from the user's text. */
function cleanContent(message: Message): string {
	const botId = message.client.user?.id
	if (!botId) return message.content
	return message.content
		.replace(new RegExp(`<@!?${botId}>`, "g"), "")
		.trim()
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
	if (!userQuestion) {
		await message.reply({
			content: "Hi — ask me something. I can summarize the channel, look up users, and more.",
			allowedMentions: { parse: [] },
		})
		return
	}

	let contextLines: string[] = []
	try {
		const fetched = await message.channel.messages.fetch({ limit: CONTEXT_MESSAGE_LIMIT, before: message.id })
		contextLines = Array.from(fetched.values())
			.reverse()
			.filter(m => !m.author.bot || m.author.id === message.client.user?.id) // exclude other bots
			.map(m => `[${m.author.username}]: ${m.content || (m.attachments.size ? "(attachment)" : "")}`)
			.filter(l => l.length > 0)
	} catch (e) {
		Log.warn("[NightHawk-AI] failed to fetch context: " + (e as Error).message)
	}

	const contextBlock = contextLines.length
		? `\n--- Recent messages in #${message.channel.name} ---\n${contextLines.join("\n")}\n--- End context ---\n\n`
		: ""

	const userTurn =
		contextBlock +
		`A staff member just asked you (${message.author.username}):\n${userQuestion}`

	/* ── 6. Type indicator while we wait ─────────────────── */
	const typing = message.channel.sendTyping().catch(() => { })

	/* ── 7. Call Claude ───────────────────────────────────── */
	const model = cfg.aiAccess.model || DEFAULT_MODEL
	let answer = ""
	try {
		const response = await anthropic.messages.create({
			model,
			max_tokens: 1024,
			system: [
				{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
			],
			messages: [{ role: "user", content: userTurn }],
		})

		const textBlock = response.content.find(b => b.type === "text")
		answer = textBlock && textBlock.type === "text" ? textBlock.text.trim() : ""

		if (!answer) answer = "(no response — Claude returned an empty message)"
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
