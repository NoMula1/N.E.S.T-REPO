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

/* Model selection.
   - DEFAULT_MODEL: user-facing conversation (mention + DM).
     Temporarily reverted to Haiku 4.5 to A/B test how much of the
     recent quality improvement is from prompt engineering vs. the
     Sonnet upgrade. Flip back to claude-sonnet-4-5 once verified.
   - AUTOMOD_MODEL: bulk Layer 2 message classifier. Haiku stays here. */
export const DEFAULT_MODEL = "claude-haiku-4-5"
export const AUTOMOD_MODEL = "claude-haiku-4-5"
