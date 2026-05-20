/* ============================================================
   NightHawk AI — safeguards
   Server allowlist, role checks, rate limits.
============================================================ */
import { GuildMember } from "discord.js"
import type { GuildConfig } from "../schemas/GuildConfig"

/** Is this guild allowed to use AI in v1?
 *  v1 = only the primary NightHawk guild. */
export function isAllowedGuild(guildId: string | undefined): boolean {
	if (!guildId) return false
	const primary = process.env.NIGHTHAWK_GUILD_ID
	if (!primary) return false
	return guildId === primary
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
