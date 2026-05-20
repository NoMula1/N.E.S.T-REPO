/* ============================================================
   NightHawk AI — Anthropic SDK client
   Single instance, lazy-initialized so the bot still boots
   even if ANTHROPIC_API_KEY isn't set yet.
============================================================ */
import Anthropic from "@anthropic-ai/sdk"
import { Log } from "../utils/logging"

let _client: Anthropic | null = null

export function getAnthropic(): Anthropic | null {
	if (_client) return _client
	const key = process.env.ANTHROPIC_API_KEY
	if (!key) {
		Log.warn("[NightHawk-AI] ANTHROPIC_API_KEY not set — AI feature disabled")
		return null
	}
	_client = new Anthropic({ apiKey: key })
	return _client
}

/* Default model for the NightHawk-AI feature.
   Per-guild override lives at NestGuildConfig.aiAccess.model. */
export const DEFAULT_MODEL = "claude-haiku-4-5"
