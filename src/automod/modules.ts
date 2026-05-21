/* ============================================================
   Automod — Layer 1 detector modules.
   Each function inspects a message and returns a violation
   object if the rule fires, or null otherwise. Pure synchronous
   logic (no Discord/Mongo calls) for speed.
============================================================ */
import { type Message } from "discord.js"
import type { GuildAutomod } from "../schemas/GuildConfig"

export interface Violation {
	moduleName: string
	moduleKey: keyof GuildAutomod["modules"]
	reason: string
	severity: 'low' | 'medium' | 'high'
	extra?: Record<string, unknown>
}

/* ─── Mass mention guard ────────────────────────────────── */
export function checkMassMention(message: Message, cfg: GuildAutomod["modules"]["massMention"]): Violation | null {
	if (!cfg.enabled) return null
	// Count UNIQUE user + role mentions
	const total = message.mentions.users.size + message.mentions.roles.size
	if (total < cfg.maxMentions) return null
	return {
		moduleName: "Mass Mention Guard",
		moduleKey: "massMention",
		reason: `Message has ${total} unique mentions (threshold: ${cfg.maxMentions}).`,
		severity: total >= cfg.maxMentions * 2 ? "high" : "medium",
		extra: { mentionCount: total, threshold: cfg.maxMentions },
	}
}

/* ─── Link / invite filter ──────────────────────────────── */
const URL_REGEX = /\bhttps?:\/\/[^\s<]+/gi
const INVITE_REGEX = /\b(?:discord\.gg|discord(?:app)?\.com\/invite)\/[a-z0-9-]+/gi

export function checkLinks(message: Message, cfg: GuildAutomod["modules"]["links"]): Violation | null {
	if (!cfg.enabled) return null
	const text = message.content || ""
	const links = text.match(URL_REGEX) || []
	if (links.length === 0) return null

	// Extract hosts
	const hosts: string[] = []
	for (const l of links) {
		try { hosts.push(new URL(l).hostname.toLowerCase().replace(/^www\./, "")) }
		catch { /* ignore bad URLs */ }
	}

	switch (cfg.mode) {
		case "block_all":
			return {
				moduleName: "Link Filter",
				moduleKey: "links",
				reason: `Posted ${links.length} link${links.length === 1 ? "" : "s"} (links not allowed).`,
				severity: "medium",
				extra: { links: links.slice(0, 5), hosts: hosts.slice(0, 5) },
			}

		case "block_new_accounts": {
			const member = message.member
			if (!member?.user?.createdAt) return null
			const ageDays = (Date.now() - member.user.createdAt.getTime()) / 86400000
			if (ageDays >= cfg.minAccountDays) return null
			return {
				moduleName: "Link Filter (new account)",
				moduleKey: "links",
				reason: `Posted a link from an account ${ageDays.toFixed(1)} days old (minimum: ${cfg.minAccountDays}).`,
				severity: "high",
				extra: { ageDays: Math.round(ageDays * 10) / 10, links: links.slice(0, 5) },
			}
		}

		case "blocklist": {
			const blocked = hosts.find(h => cfg.domainList.includes(h))
			if (!blocked) return null
			return {
				moduleName: "Link Filter (blocklist)",
				moduleKey: "links",
				reason: `Posted blocked domain \`${blocked}\`.`,
				severity: "high",
				extra: { blocked, allLinks: links.slice(0, 5) },
			}
		}

		case "allowlist": {
			const offending = hosts.find(h => !cfg.domainList.includes(h))
			if (!offending) return null
			return {
				moduleName: "Link Filter (allowlist)",
				moduleKey: "links",
				reason: `Posted non-allowlisted domain \`${offending}\`.`,
				severity: "medium",
				extra: { offending, allLinks: links.slice(0, 5) },
			}
		}

		default:
			return null
	}
}

/* ─── Account age requirement ───────────────────────────── */
export function checkAccountAge(message: Message, cfg: GuildAutomod["modules"]["accountAge"]): Violation | null {
	if (!cfg.enabled) return null
	const member = message.member
	if (!member?.user?.createdAt) return null

	const accountAgeDays = (Date.now() - member.user.createdAt.getTime()) / 86400000
	const serverAgeDays = member.joinedAt ? (Date.now() - member.joinedAt.getTime()) / 86400000 : Infinity

	if (accountAgeDays >= cfg.minAccountDays && serverAgeDays >= cfg.minServerDays) return null

	const reasons: string[] = []
	if (accountAgeDays < cfg.minAccountDays) reasons.push(`Discord account is ${accountAgeDays.toFixed(1)}d old (min ${cfg.minAccountDays})`)
	if (serverAgeDays < cfg.minServerDays) reasons.push(`server membership is ${serverAgeDays === Infinity ? "?" : serverAgeDays.toFixed(1)}d old (min ${cfg.minServerDays})`)

	return {
		moduleName: "Account Age Filter",
		moduleKey: "accountAge",
		reason: reasons.join("; "),
		severity: "low",
		extra: { accountAgeDays: Math.round(accountAgeDays * 10) / 10, serverAgeDays: serverAgeDays === Infinity ? null : Math.round(serverAgeDays * 10) / 10 },
	}
}

/* ─── Spam-rate detector ────────────────────────────────── */
/* Per-user sliding window tracker. Lives in-memory; bot restart resets it. */
const recentMessages = new Map<string, number[]>()  // userId -> [timestamps]

export function checkSpamRate(message: Message, cfg: GuildAutomod["modules"]["spamRate"]): Violation | null {
	if (!cfg.enabled) return null
	const now = Date.now()
	const windowMs = cfg.windowSeconds * 1000

	const userId = message.author.id
	const history = (recentMessages.get(userId) || []).filter(t => now - t < windowMs)
	history.push(now)
	recentMessages.set(userId, history)

	if (history.length < cfg.maxMessages) return null
	return {
		moduleName: "Spam Rate Limit",
		moduleKey: "spamRate",
		reason: `${history.length} messages in ${cfg.windowSeconds}s (threshold: ${cfg.maxMessages}).`,
		severity: "medium",
		extra: { messagesInWindow: history.length, threshold: cfg.maxMessages, windowSeconds: cfg.windowSeconds },
	}
}

/* Periodic cleanup of stale timestamps */
setInterval(() => {
	const now = Date.now()
	const cutoff = 120 * 1000   // anything older than 2 min is irrelevant for any reasonable window
	for (const [uid, ts] of recentMessages) {
		const filtered = ts.filter(t => now - t < cutoff)
		if (filtered.length === 0) recentMessages.delete(uid)
		else recentMessages.set(uid, filtered)
	}
}, 60 * 1000).unref?.()

/* ─── Word/phrase filter ────────────────────────────────── */
export function checkWordFilter(message: Message, cfg: GuildAutomod["modules"]["wordFilter"]): Violation | null {
	if (!cfg.enabled) return null
	if (!cfg.words || cfg.words.length === 0) return null

	const content = (message.content || "").toLowerCase()
	if (!content) return null

	for (const w of cfg.words) {
		const target = w.toLowerCase().trim()
		if (!target) continue
		if (content.includes(target)) {
			return {
				moduleName: "Word/Phrase Filter",
				moduleKey: "wordFilter",
				reason: `Matched filtered term \`${target}\`.`,
				severity: "medium",
				extra: { match: target },
			}
		}
	}
	return null
}
