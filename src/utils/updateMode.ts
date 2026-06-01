/* ──────────────────────────────────────────────────────────────────
   updateMode — runtime state + helpers for Update Mode tracking.

   An in-memory Set of guild IDs currently tracking keeps the hot path
   (every channel/role/emoji event the bot sees) cheap: events that
   aren't for a tracking guild bail instantly without touching the DB.
   The Set is repopulated from the DB on startup so tracking survives a
   restart.
   ────────────────────────────────────────────────────────────────── */
import UpdateTracking from "../schemas/UpdateTracking"

/** All trackable change types. */
export const TRACK_TYPES = ["channels", "roles", "emojis", "settings", "bots"] as const
export type TrackType = (typeof TRACK_TYPES)[number]

const ACTIVE = new Set<string>()

export function isTracking(guildID: string): boolean { return ACTIVE.has(guildID) }
export function setActiveLocal(guildID: string, on: boolean): void { on ? ACTIVE.add(guildID) : ACTIVE.delete(guildID) }

/** Repopulate the active set from the DB (call on client ready). */
export async function refreshActive(): Promise<void> {
	try {
		ACTIVE.clear()
		const docs = await UpdateTracking.find({ active: true }).select("guildID").lean()
		for (const d of docs as any[]) ACTIVE.add(d.guildID)
	} catch { /* non-fatal */ }
}

/**
 * Record a change if the guild is actively tracking that type. Cheap
 * no-op when the guild isn't tracking (Set check, no DB hit).
 */
export async function recordChange(guildID: string, type: TrackType, action: string, name: string, detail = ""): Promise<void> {
	if (!ACTIVE.has(guildID)) return
	try {
		const doc = await UpdateTracking.findOne({ guildID, active: true })
		if (!doc) { ACTIVE.delete(guildID); return }
		if (!doc.types.includes(type)) return
		if (doc.changes.length >= 500) return   // safety cap per session
		doc.changes.push({ type, action, name: name.slice(0, 120), detail: detail.slice(0, 300), at: new Date() } as any)
		await doc.save()
	} catch { /* non-fatal */ }
}

const TYPE_LABEL: Record<string, string> = {
	channels: "Channels",
	roles: "Roles",
	emojis: "Emojis",
	settings: "Server Settings",
	bots: "Bots",
}
const TYPE_ORDER = ["channels", "roles", "emojis", "settings", "bots"]

/**
 * Turn a list of tracked changes into a markdown changelog body, grouped
 * by type. This is the auto-draft the bot produces on Finish (Phase 4's
 * AI will polish it; Phase 3 ships the raw structured draft).
 */
export function draftMarkdownFromChanges(changes: { type: string; action: string; name: string; detail: string }[]): string {
	if (!changes.length) return "_No tracked changes were recorded during this session._"
	const byType: Record<string, string[]> = {}
	for (const c of changes) {
		const line = `- ${cap(c.action)}: **${c.name}**${c.detail ? ` — ${c.detail}` : ""}`
		;(byType[c.type] = byType[c.type] || []).push(line)
	}
	const sections: string[] = []
	for (const t of TYPE_ORDER) {
		if (!byType[t]) continue
		sections.push(`## ${TYPE_LABEL[t] || cap(t)}\n${byType[t].join("\n")}`)
	}
	// Any types not in the known order (future-proof)
	for (const t of Object.keys(byType)) {
		if (TYPE_ORDER.includes(t)) continue
		sections.push(`## ${cap(t)}\n${byType[t].join("\n")}`)
	}
	return sections.join("\n\n---\n\n")
}

function cap(s: string): string { return s ? s[0].toUpperCase() + s.slice(1) : s }
