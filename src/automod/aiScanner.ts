/* ============================================================
   NightHawk automod — AI scanner.
   Claude acts AS the automod (not just confirming Layer 1 hits).
   Per-guild queues; flushes every N seconds OR when batchSize is
   reached. Single Claude call per batch; cached system prompt
   keeps cost predictable.
============================================================ */
import { Guild, Message, TextChannel } from "discord.js"
import { getAnthropic, DEFAULT_MODEL } from "../ai/client"
import { getFreshGuildConfig } from "../utils/GuildConfigCache"
import type { GuildConfig, AutomodAction } from "../schemas/GuildConfig"
import { applyAction } from "./actions"
import { Log } from "../utils/logging"
import type Anthropic from "@anthropic-ai/sdk"

interface QueueEntry {
	messageId: string
	channelId: string
	authorId: string
	authorTag: string
	accountAgeDays: number
	serverAgeDays: number | null
	content: string
	hasAttachments: boolean
	timestamp: number
	// Hold a soft reference back to the live Message for action execution.
	// If the message gets deleted before we flush, the reference becomes a noop.
	messageRef: Message
}

interface GuildQueue {
	guildId: string
	entries: QueueEntry[]
	flushTimer: NodeJS.Timeout | null
}

const queues = new Map<string, GuildQueue>()

const AUTOMOD_SYSTEM_PROMPT = `You are an automated moderation classifier for a Discord server run by NightHawk. You receive a batch of recent messages and must classify each as one of:

- "scam"          : impersonation, fake giveaways, casino/gambling scams, phishing, get-rich schemes, fake job offers, crypto fraud
- "spam"          : repetitive low-value content, raid spam, mass-mentions, NSFW server promotion, bot-driven advertising
- "harassment"    : slurs, targeted abuse, doxing, harassment of specific users
- "rule_violation": clear Discord-TOS or generic community-norms violation that isn't covered above
- "legit"         : normal conversation, even if casual or contains some keywords. Default to this unless confident otherwise.

For each message return a JSON object with: id, verdict (one of the five above), confidence (0-100), reason (one short sentence). Wrap them in an array. Output ONLY valid JSON — no preamble, no markdown, no explanation outside the JSON.

Be especially alert to:
- New accounts (< 7 days) posting unsolicited links
- Impersonation of well-known figures (MrBeast, KSI, brand accounts)
- Crypto + giveaway + sketchy-looking URL = high-confidence scam
- Discord invite links from new accounts = likely spam
- Letter-substitution bypasses (l33t speak, zero-width chars)
- Image-based scams (you'll see them as "(attachment)" — flag as needs_review)

Conservative default: when in doubt, classify "legit" with low confidence. False positives are worse than false negatives because they affect real users.`

interface BatchVerdict {
	id: string
	verdict: 'scam' | 'spam' | 'harassment' | 'rule_violation' | 'legit'
	confidence: number
	reason: string
}

async function classifyBatch(entries: QueueEntry[]): Promise<BatchVerdict[]> {
	const anthropic = getAnthropic()
	if (!anthropic) return []

	const formatted = entries.map(e => ({
		id: e.messageId,
		author: e.authorTag,
		account_age_days: Math.round(e.accountAgeDays * 10) / 10,
		server_age_days: e.serverAgeDays === null ? null : Math.round(e.serverAgeDays * 10) / 10,
		channel_id: e.channelId,
		content: e.content || (e.hasAttachments ? "(attachment, no text)" : ""),
	}))

	const userTurn = `Classify each of the following ${formatted.length} message${formatted.length === 1 ? "" : "s"}. Return a JSON array of verdicts.\n\n${JSON.stringify(formatted, null, 2)}`

	try {
		const response = await anthropic.messages.create({
			model: DEFAULT_MODEL,
			max_tokens: 2000,
			system: [{ type: "text", text: AUTOMOD_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
			messages: [{ role: "user", content: userTurn }],
		})
		const textBlock = response.content.find(b => b.type === "text") as Anthropic.TextBlock | undefined
		if (!textBlock) return []

		// Strip any leading/trailing junk; find the JSON array
		let text = textBlock.text.trim()
		const start = text.indexOf("[")
		const end = text.lastIndexOf("]")
		if (start < 0 || end < 0) return []
		text = text.slice(start, end + 1)

		const parsed = JSON.parse(text)
		if (!Array.isArray(parsed)) return []
		return parsed as BatchVerdict[]
	} catch (e) {
		Log.error("[automod/ai] classify batch failed: " + (e as Error).message)
		return []
	}
}

async function flushQueue(guildId: string, guild: Guild): Promise<void> {
	const q = queues.get(guildId)
	if (!q || q.entries.length === 0) return
	const entries = q.entries.splice(0, q.entries.length) // drain
	if (q.flushTimer) { clearTimeout(q.flushTimer); q.flushTimer = null }

	const cfg = await getFreshGuildConfig(guildId)
	if (!cfg?.automod?.aiAutomod?.enabled) return

	const verdicts = await classifyBatch(entries)
	if (verdicts.length === 0) return

	const action: AutomodAction = cfg.automod.aiAutomod.action

	for (const v of verdicts) {
		if (v.verdict === "legit") continue
		if (typeof v.confidence === "number" && v.confidence < 60) continue // tunable threshold

		const entry = entries.find(e => e.messageId === v.id)
		if (!entry) continue

		// Verify the message still exists
		const msg = entry.messageRef
		if (!msg || !msg.guild) continue

		await applyAction({
			message: msg,
			cfg: cfg as GuildConfig,
			moduleName: `AI Moderator (${v.verdict})`,
			reason: `${v.reason} (confidence ${v.confidence}%)`,
			configuredAction: action,
			severity: v.confidence > 85 ? "high" : v.confidence > 70 ? "medium" : "low",
			extra: { aiVerdict: v.verdict, confidence: v.confidence },
		})
	}
}

/** Phase 2: one-off AI confirmation for a Layer 1 hit. Used when a
 *  module has aiCheck enabled. Returns true if AI confirms the violation
 *  (action should proceed), false if AI thinks it's a false positive. */
export async function confirmViolationWithAi(
	message: Message,
	moduleName: string,
	reason: string,
): Promise<{ confirm: boolean; aiReason: string }> {
	const anthropic = getAnthropic()
	if (!anthropic) return { confirm: true, aiReason: "(no AI client; defaulting to confirm)" }

	const member = message.member
	const accountAgeDays = member?.user?.createdAt
		? (Date.now() - member.user.createdAt.getTime()) / 86400000
		: 0
	const userTurn = `A Layer 1 automod rule flagged this message. Was it a real violation, or a false positive?

Rule: ${moduleName}
Rule's reason: ${reason}
Author: ${message.author.tag} (account ${Math.round(accountAgeDays)} days old)
Content: ${(message.content || "(no text)").slice(0, 500)}

Respond with JSON: {"confirm": true|false, "reason": "<one sentence>"}`

	try {
		const response = await anthropic.messages.create({
			model: DEFAULT_MODEL,
			max_tokens: 200,
			system: [{ type: "text", text: AUTOMOD_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
			messages: [{ role: "user", content: userTurn }],
		})
		const textBlock = response.content.find(b => b.type === "text") as Anthropic.TextBlock | undefined
		if (!textBlock) return { confirm: true, aiReason: "(no AI response)" }
		const text = textBlock.text.trim()
		const start = text.indexOf("{")
		const end = text.lastIndexOf("}")
		if (start < 0 || end < 0) return { confirm: true, aiReason: "(unparseable AI response)" }
		const parsed = JSON.parse(text.slice(start, end + 1))
		return { confirm: !!parsed.confirm, aiReason: parsed.reason || "(no reason given)" }
	} catch (e) {
		Log.warn("[automod/ai] confirm err: " + (e as Error).message)
		return { confirm: true, aiReason: "(AI error; defaulting to confirm)" }
	}
}

/** Decide whether to queue this message for AI scanning, based on the
 *  guild's aiAutomod config. Returns true if queued. */
export async function maybeQueueForAi(message: Message, cfg: GuildConfig): Promise<boolean> {
	const ai = cfg.automod?.aiAutomod
	if (!ai?.enabled) return false
	if (ai.mode === "confirm_layer1") return false // only sees Layer 1 hits; not queueable here

	// Channel skip list
	if (ai.skipChannelIds?.includes(message.channelId)) return false

	// Sampling rule
	if (ai.mode === "sample_all") {
		if (Math.random() * 100 > (ai.sampleRate ?? 10)) return false
	}
	// scan_all: queue everything (already past pre-filters in scanMessage)

	const member = message.member
	const accountAgeDays = member?.user?.createdAt
		? (Date.now() - member.user.createdAt.getTime()) / 86400000
		: 0
	const serverAgeDays = member?.joinedAt
		? (Date.now() - member.joinedAt.getTime()) / 86400000
		: null

	if (!message.guild) return false
	const guildId = message.guild.id
	let q = queues.get(guildId)
	if (!q) {
		q = { guildId, entries: [], flushTimer: null }
		queues.set(guildId, q)
	}

	q.entries.push({
		messageId: message.id,
		channelId: message.channelId,
		authorId: message.author.id,
		authorTag: message.author.tag,
		accountAgeDays,
		serverAgeDays,
		content: (message.content || "").slice(0, 500),
		hasAttachments: message.attachments.size > 0,
		timestamp: Date.now(),
		messageRef: message,
	})

	// Flush immediately if at batch size
	if (q.entries.length >= (ai.batchSize ?? 10)) {
		if (q.flushTimer) { clearTimeout(q.flushTimer); q.flushTimer = null }
		flushQueue(guildId, message.guild).catch(e => Log.error("[automod/ai] flush err: " + (e as Error).message))
		return true
	}

	// Otherwise schedule a timed flush
	if (!q.flushTimer) {
		const intervalMs = (ai.batchIntervalSeconds ?? 20) * 1000
		q.flushTimer = setTimeout(() => {
			if (message.guild) flushQueue(guildId, message.guild).catch(e => Log.error("[automod/ai] flush err: " + (e as Error).message))
		}, intervalMs)
	}

	return true
}
