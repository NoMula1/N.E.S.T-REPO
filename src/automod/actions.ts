/* ============================================================
   Automod — action executor.
   Translates a configured action ('alert' | 'delete' |
   'delete_timeout') + a detected violation into actual Discord
   operations + a post to the alert channel.
============================================================ */
import { type Message } from "discord.js"
import type { AutomodAction, GuildConfig } from "../schemas/GuildConfig"
import { postAlert } from "./alerts"
import { Log } from "../utils/logging"

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

export interface ApplyOptions {
	message: Message
	cfg: GuildConfig
	moduleName: string   // human-friendly for the alert ("Mass Mention Guard")
	reason: string       // why it fired ("6 mentions in one message")
	configuredAction: AutomodAction
	severity?: 'low' | 'medium' | 'high'
	extra?: Record<string, unknown>
}

export async function applyAction(opts: ApplyOptions): Promise<void> {
	const { message, cfg, configuredAction } = opts
	if (!message.guild) return

	let actionTaken = "alert"

	try {
		if (configuredAction === "delete" || configuredAction === "delete_timeout") {
			await message.delete().catch(e => {
				Log.warn(`[automod] delete failed (${opts.moduleName}): ${(e as Error).message}`)
			})
			actionTaken = "deleted"
		}

		if (configuredAction === "delete_timeout") {
			if (message.member && !message.member.communicationDisabledUntil) {
				await message.member.timeout(DEFAULT_TIMEOUT_MS, `NightHawk automod: ${opts.moduleName}`).catch(e => {
					Log.warn(`[automod] timeout failed: ${(e as Error).message}`)
				})
				actionTaken = "deleted + timed out 10m"
			} else {
				actionTaken = "deleted (already timed out)"
			}
		}
	} catch (e) {
		Log.error(`[automod] applyAction crash: ${(e as Error).message}`)
	}

	await postAlert(message.guild, cfg, {
		moduleName: opts.moduleName,
		reason: opts.reason,
		action: actionTaken,
		message,
		severity: opts.severity,
		extra: opts.extra,
	})
}
