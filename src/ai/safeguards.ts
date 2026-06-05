/* ============================================================
   NightHawk AI — safeguards
   Server allowlist, role checks, rate limits.
============================================================ */
import { GuildMember } from "discord.js"
import type { GuildConfig } from "../schemas/GuildConfig"
import NestSystemConfigModel from "../schemas/NestSystemConfig"
import { Log } from "../utils/logging"

/* Cached AI-portal allowlist (guild IDs) from the shared NEST db
   (nest_system_config singleton, managed by staff at
   /riot/staff-admin on the website). Refreshed at most once per minute
   so dashboard changes propagate without a bot restart. */
let allowlistCache: { ids: Set<string>; expiresAt: number } | null = null
const ALLOWLIST_TTL_MS = 60_000

async function getAllowlistedGuildIds(): Promise<Set<string>> {
	const now = Date.now()
	if (allowlistCache && allowlistCache.expiresAt > now) return allowlistCache.ids
	const doc = await NestSystemConfigModel.findOne({ key: 'config' }).lean()
	const ids = new Set<string>(doc?.aiPortalGuildIds ?? [])
	allowlistCache = { ids, expiresAt: now + ALLOWLIST_TTL_MS }
	return ids
}

/** Is this guild allowed to use AI?
 *  Allowed if it is the env primary NightHawk guild (always), OR it is in
 *  the staff-managed allowlist (nest_system_config.aiPortalGuildIds).
 *  Fails closed: if the allowlist lookup errors, access is denied. */
export async function isAllowedGuild(guildId: string | undefined): Promise<boolean> {
	if (!guildId) return false
	const primary = process.env.NIGHTHAWK_GUILD_ID
	if (primary && guildId === primary) return true
	try {
		const ids = await getAllowlistedGuildIds()
		return ids.has(guildId)
	} catch (err) {
		Log.error("[NightHawk-AI] allowlist lookup failed: " + (err as Error).message)
		return false
	}
}

/** Does this member have permission to invoke the AI in this guild?
 *  Pure role-based: aiAccess.enabled must be true, the member must hold
 *  at least one of the configured aiAccess.roleIds. Discord Administrator
 *  permission is NOT a shortcut — the configured role is the source of
 *  truth. If the server owner wants access, they grant themselves the
 *  configured role like anyone else. */
export function memberCanUseAi(member: GuildMember, cfg: GuildConfig | null | undefined): boolean {
	if (!cfg?.aiAccess?.enabled) return false
	const allowedRoles = cfg.aiAccess.roleIds || []
	if (allowedRoles.length === 0) return false
	return member.roles.cache.some(r => allowedRoles.includes(r.id))
}

/* ── In-memory rate limit ────────────────────────────────────
   Per-user: max 6 invocations per minute. Keeps cost bounded
   while we test. Resets on bot restart, which is fine for now. */
const userHits = new Map<string, number[]>()
const RATE_WINDOW_MS = 60_000
const RATE_LIMIT = 6

export function checkRateLimit(userId: string): { ok: boolean; retryAfter: number } {
	const now = Date.now()
	const hits = (userHits.get(userId) || []).filter(t => now - t < RATE_WINDOW_MS)
	if (hits.length >= RATE_LIMIT) {
		const oldest = hits[0]
		return { ok: false, retryAfter: Math.ceil((RATE_WINDOW_MS - (now - oldest)) / 1000) }
	}
	hits.push(now)
	userHits.set(userId, hits)
	return { ok: true, retryAfter: 0 }
}

/** DM access — independent from channel/role gating since DMs aren't
 *  tied to any guild. Reads from the primary NightHawk hub guild's
 *  aiAccess.dmEnabled + dmAllowedUserIds list. */
export function userCanUseAiInDm(userId: string, cfg: GuildConfig | null | undefined): boolean {
	if (!cfg?.aiAccess) return false
	if (!cfg.aiAccess.dmEnabled) return false
	const allowed = cfg.aiAccess.dmAllowedUserIds || []
	if (allowed.length === 0) return false
	return allowed.includes(userId)
}
