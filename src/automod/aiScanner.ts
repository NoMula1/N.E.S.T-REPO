/* ============================================================
   NightHawk automod — AI scanner.
   Claude acts AS the automod (not just confirming Layer 1 hits).
   Per-guild queues; flushes every N seconds OR when batchSize is
   reached. Single Claude call per batch; cached system prompt
   keeps cost predictable.
============================================================ */
import { Guild, Message, TextChannel } from "discord.js"
import { getAnthropic, AUTOMOD_MODEL } from "../ai/client"
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
	hasAnyRole: boolean
	content: string
	hasAttachments: boolean
	imageUrls: string[]   // image attachment URLs (max 4, jpeg/png/webp/gif only)
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

/* ── Per-guild daily image-budget tracking ──
   Counts images sent to Claude. Resets at UTC midnight.
   Cap is enforced from cfg.automod.aiAutomod.imageDailyCap. */
interface ImageBudgetState {
	dateStamp: string     // YYYY-MM-DD UTC, used to detect day rollover
	imagesUsed: number
}
const imageBudgets = new Map<string, ImageBudgetState>()
function todayUTC(): string {
	const d = new Date()
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
}
function getImageBudget(guildId: string): ImageBudgetState {
	const today = todayUTC()
	let b = imageBudgets.get(guildId)
	if (!b || b.dateStamp !== today) {
		b = { dateStamp: today, imagesUsed: 0 }
		imageBudgets.set(guildId, b)
	}
	return b
}

/* Discord image attachments — what we accept for vision */
const IMAGE_MIME_PREFIX = "image/"
const SUPPORTED_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])
const MAX_IMAGES_PER_MESSAGE = 4
function extractImageUrls(message: Message): string[] {
	const urls: string[] = []
	for (const att of message.attachments.values()) {
		const ct = (att.contentType || "").toLowerCase()
		if (!ct.startsWith(IMAGE_MIME_PREFIX)) continue
		// Reject .gif via Claude — animated gifs aren't supported by vision in the API.
		// Plain image/gif still works in Discord (often stills) so we keep it,
		// but the API call will use the first frame implicitly.
		if (!SUPPORTED_IMAGE_MIMES.has(ct)) continue
		if (urls.length >= MAX_IMAGES_PER_MESSAGE) break
		urls.push(att.url)
	}
	return urls
}

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
- IMAGE-BASED SCAMS: if a message includes one or more attached
  images, you can SEE them. Look for: fake Robux giveaway screens,
  fake admin / staff impersonation UIs, phishing screenshots that
  mimic Roblox/Discord login, fake free-item promos, QR codes
  promising rewards. Image-only scams are the most-evaded category
  by text filters. When you flag an image-based hit, mention "image"
  briefly in the reason field.

Conservative default: when in doubt, classify "legit" with low confidence. False positives are worse than false negatives because they affect real users.`

interface BatchVerdict {
	id: string
	verdict: 'scam' | 'spam' | 'harassment' | 'rule_violation' | 'legit'
	confidence: number
	reason: string
}

/* Decide which entries get their images attached based on cfg + budget.
   Mutates entries.imageUrls in place (strips images that won't be sent). */
function applyImageBudget(
	entries: QueueEntry[],
	cfg: GuildConfig,
	guildId: string,
): { entriesWithImages: number; imagesSent: number } {
	const ai = cfg.automod?.aiAutomod
	if (!ai || !ai.scanImages) {
		entries.forEach(e => (e.imageUrls = []))
		return { entriesWithImages: 0, imagesSent: 0 }
	}
	const budget = getImageBudget(guildId)
	const cap = Math.max(0, ai.imageDailyCap ?? 500)
	const sampleRate = Math.max(0, Math.min(100, ai.imageSampleRate ?? 25))
	const repSkip = !!ai.imageReputationSkip

	let entriesWithImages = 0
	let imagesSent = 0
	for (const e of entries) {
		if (e.imageUrls.length === 0) continue
		// Reputation skip — trusted accounts get text-only treatment
		if (repSkip && e.accountAgeDays > 90 && e.hasAnyRole) {
			e.imageUrls = []
			continue
		}
		// Sample rate — random skip
		if (Math.random() * 100 > sampleRate) {
			e.imageUrls = []
			continue
		}
		// Budget — drop if today's cap would be exceeded
		const wanted = e.imageUrls.length
		const remaining = Math.max(0, cap - budget.imagesUsed)
		if (remaining === 0) {
			e.imageUrls = []
			continue
		}
		if (wanted > remaining) {
			e.imageUrls = e.imageUrls.slice(0, remaining)
		}
		budget.imagesUsed += e.imageUrls.length
		imagesSent += e.imageUrls.length
		entriesWithImages++
	}
	return { entriesWithImages, imagesSent }
}

async function classifyBatch(entries: QueueEntry[], cfg: GuildConfig, guildId: string): Promise<BatchVerdict[]> {
	const anthropic = getAnthropic()
	if (!anthropic) return []

	// Filter / sample image attachments based on cfg + daily budget
	const { entriesWithImages, imagesSent } = applyImageBudget(entries, cfg, guildId)
	if (imagesSent > 0) Log.info(`[automod/ai] vision attached ${imagesSent} image(s) across ${entriesWithImages} entr${entriesWithImages === 1 ? "y" : "ies"} (guild ${guildId})`)

	const formatted = entries.map(e => ({
		id: e.messageId,
		author: e.authorTag,
		account_age_days: Math.round(e.accountAgeDays * 10) / 10,
		server_age_days: e.serverAgeDays === null ? null : Math.round(e.serverAgeDays * 10) / 10,
		channel_id: e.channelId,
		content: e.content || (e.hasAttachments ? "(attachment, see image below)" : ""),
		image_count: e.imageUrls.length,
	}))

	// Build multi-modal content blocks. When any entry has images attached we
	// build a mixed text+image payload; otherwise we send a single text turn.
	const hasAnyImages = entries.some(e => e.imageUrls.length > 0)
	let userContent: Anthropic.Messages.ContentBlockParam[] | string
	if (hasAnyImages) {
		const blocks: Anthropic.Messages.ContentBlockParam[] = [
			{
				type: "text",
				text: `Classify each of the following ${formatted.length} message${formatted.length === 1 ? "" : "s"}. Some messages have attached images interleaved below — use them as evidence. Return a JSON array of verdicts.\n\n${JSON.stringify(formatted, null, 2)}\n\nImages follow, labeled by message id:`,
			},
		]
		for (const e of entries) {
			if (e.imageUrls.length === 0) continue
			blocks.push({ type: "text", text: `\n--- Images for message ${e.messageId} (author ${e.authorTag}) ---` })
			for (const url of e.imageUrls) {
				blocks.push({
					type: "image",
					source: { type: "url", url } as Anthropic.Messages.ImageBlockParam["source"],
				})
			}
		}
		userContent = blocks
	} else {
		userContent = `Classify each of the following ${formatted.length} message${formatted.length === 1 ? "" : "s"}. Return a JSON array of verdicts.\n\n${JSON.stringify(formatted, null, 2)}`
	}

	try {
		const response = await anthropic.messages.create({
			model: AUTOMOD_MODEL,
			max_tokens: 2000,
			system: [{ type: "text", text: AUTOMOD_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
			messages: [{ role: "user", content: userContent as any }],
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

	const verdicts = await classifyBatch(entries, cfg as GuildConfig, guildId)
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
	const imageUrls = extractImageUrls(message)
	const textTurn = `A Layer 1 automod rule flagged this message. Was it a real violation, or a false positive?

Rule: ${moduleName}
Rule's reason: ${reason}
Author: ${message.author.tag} (account ${Math.round(accountAgeDays)} days old)
Content: ${(message.content || "(no text)").slice(0, 500)}
${imageUrls.length ? `Attached images: ${imageUrls.length} (see below — use them as evidence)` : ""}

Respond with JSON: {"confirm": true|false, "reason": "<one sentence>"}`

	let userContent: Anthropic.Messages.ContentBlockParam[] | string = textTurn
	if (imageUrls.length > 0) {
		const blocks: Anthropic.Messages.ContentBlockParam[] = [{ type: "text", text: textTurn }]
		for (const url of imageUrls) {
			blocks.push({
				type: "image",
				source: { type: "url", url } as Anthropic.Messages.ImageBlockParam["source"],
			})
		}
		userContent = blocks
	}

	try {
		const response = await anthropic.messages.create({
			model: AUTOMOD_MODEL,
			max_tokens: 200,
			system: [{ type: "text", text: AUTOMOD_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
			messages: [{ role: "user", content: userContent as any }],
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

	const memberRoles = member?.roles?.cache
	const hasAnyRole = !!memberRoles && memberRoles.filter(r => r.id !== message.guild!.id).size > 0

	q.entries.push({
		messageId: message.id,
		channelId: message.channelId,
		authorId: message.author.id,
		authorTag: message.author.tag,
		accountAgeDays,
		serverAgeDays,
		hasAnyRole,
		content: (message.content || "").slice(0, 500),
		hasAttachments: message.attachments.size > 0,
		imageUrls: extractImageUrls(message),
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
