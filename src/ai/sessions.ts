/* ============================================================
   NightHawk AI — conversation sessions
   When a user @-mentions the bot, a session opens for that
   (guild, channel, user). Follow-up messages in the same channel
   from the same user are routed to the AI WITHOUT needing a
   re-mention, until the user says "farewell" or 5 min idle.
   Sessions are in-memory only — bot restart wipes them, which is
   acceptable for v1.
============================================================ */
import type Anthropic from "@anthropic-ai/sdk"
import { Log } from "../utils/logging"

export interface AiSession {
	guildId: string
	channelId: string
	userId: string
	startedAt: number
	lastActivityAt: number
	/** Claude-formatted conversation history (alternating user/assistant). */
	messages: Anthropic.MessageParam[]
}

const sessions = new Map<string, AiSession>()
export const SESSION_TIMEOUT_MS = 5 * 60 * 1000   // 5 min of no activity
export const MAX_TURNS_KEPT     = 20              // cap history at ~10 exchanges

function keyOf(guildId: string, channelId: string, userId: string): string {
	return `${guildId}:${channelId}:${userId}`
}

/** Get the active session if any. Returns null if missing or stale. */
export function getSession(guildId: string, channelId: string, userId: string): AiSession | null {
	const k = keyOf(guildId, channelId, userId)
	const s = sessions.get(k)
	if (!s) return null
	if (Date.now() - s.lastActivityAt > SESSION_TIMEOUT_MS) {
		sessions.delete(k)
		return null
	}
	return s
}

/** Create or reset a session for this (guild, channel, user) tuple. */
export function startSession(guildId: string, channelId: string, userId: string): AiSession {
	const k = keyOf(guildId, channelId, userId)
	const s: AiSession = {
		guildId, channelId, userId,
		startedAt: Date.now(),
		lastActivityAt: Date.now(),
		messages: [],
	}
	sessions.set(k, s)
	return s
}

/** Tear down an active session (e.g. user said farewell). No-op if missing. */
export function endSession(guildId: string, channelId: string, userId: string): void {
	sessions.delete(keyOf(guildId, channelId, userId))
}

/** Append messages to a session's history, capping at MAX_TURNS_KEPT.
 *
 *  CRITICAL: When we truncate, we must NOT slice between a tool_use
 *  block in an assistant message and its matching tool_result blocks
 *  in the next user message. Doing so leaves an orphan tool_result at
 *  index 0 of the kept array, which Claude rejects with:
 *
 *    400 invalid_request_error — messages.0.content.0: unexpected
 *    tool_use_id found in tool_result blocks
 *
 *  Strategy: compute the ideal slice point (last N messages), then
 *  walk FORWARD from there until we find a user message that has no
 *  tool_result blocks (i.e. a fresh conversational turn, not a tool
 *  response). Slice from that index. That guarantees we always keep
 *  complete tool_use → tool_result exchanges or drop them entirely.
 */
export function appendToSession(session: AiSession, ...msgs: Anthropic.MessageParam[]): void {
	session.messages.push(...msgs)
	if (session.messages.length > MAX_TURNS_KEPT) {
		const idealStart = session.messages.length - MAX_TURNS_KEPT
		let safeStart = idealStart
		while (safeStart < session.messages.length) {
			const msg = session.messages[safeStart]
			if (msg.role === "user") {
				const content = msg.content as unknown
				const hasToolResult = Array.isArray(content) && content.some((b) => {
					return b && typeof b === "object" && (b as { type?: string }).type === "tool_result"
				})
				if (!hasToolResult) break // safe — this is a fresh user turn
			}
			safeStart++
		}
		// Worst case (every slot has tool_result), we drop everything.
		// That's correct: better an empty history than a broken one.
		session.messages = session.messages.slice(safeStart)
	}
	session.lastActivityAt = Date.now()
}

/** Defensive reset — wipe the session's history but keep it open.
 *  Use when Claude returns a 400 indicating the conversation state
 *  is corrupted; we'd rather restart the thread than 500 the user. */
export function resetSessionHistory(session: AiSession): void {
	session.messages = []
	session.lastActivityAt = Date.now()
}

/** Detect a farewell intent — used to close the session politely. */
export function isFarewell(text: string): boolean {
	if (!text) return false
	// Standalone "farewell" anywhere in the message, case-insensitive.
	// Also accept a few common close-out variants when used as the dominant intent.
	return /\bfarewell\b/i.test(text)
}

/** Periodic cleanup — every minute, drop sessions that timed out. */
setInterval(() => {
	const now = Date.now()
	let dropped = 0
	for (const [k, s] of sessions) {
		if (now - s.lastActivityAt > SESSION_TIMEOUT_MS) {
			sessions.delete(k)
			dropped++
		}
	}
	if (dropped > 0) Log.info(`[NightHawk-AI/sessions] cleaned ${dropped} idle session${dropped === 1 ? "" : "s"}`)
}, 60 * 1000).unref?.()
