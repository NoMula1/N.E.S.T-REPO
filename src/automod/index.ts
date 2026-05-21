/* ============================================================
   Automod — main scan loop.
   Runs every message through every enabled detector module.
   On a hit, applies the configured action (alert / delete /
   delete_timeout) and posts to the alert channel.
============================================================ */
import { Message } from "discord.js"
import { getFreshGuildConfig } from "../utils/GuildConfigCache"
import type { GuildAutomod } from "../schemas/GuildConfig"
import { Log } from "../utils/logging"
import {
	type Violation,
	checkAccountAge,
	checkLinks,
	checkMassMention,
	checkSpamRate,
	checkWordFilter,
} from "./modules"
import { applyAction } from "./actions"

/**
 * Entry point — called from messageCreate event.
 * Returns immediately (silently) if the user / message / config
 * doesn't warrant scanning.
 */
export async function scanMessage(message: Message): Promise<void> {
	/* ── Pre-filter: skip what can't possibly violate ── */
	if (!message.guild) return
	if (message.author.bot) return
	if (!message.member) return
	if (!message.guild.members.me) return
	// Skip very short messages — common patterns ("k", "lol") aren't worth scanning
	if ((message.content || "").length < 2 && message.attachments.size === 0 && message.embeds.length === 0) return

	const cfg = await getFreshGuildConfig(message.guild.id)
	if (!cfg?.automod?.enabled) return

	/* Bypass roles — staff / trusted */
	const bypassRoles = cfg.automod.bypassRoleIds || []
	if (bypassRoles.length > 0 && message.member.roles.cache.some(r => bypassRoles.includes(r.id))) {
		return
	}

	const mods = cfg.automod.modules

	/* Run each enabled detector in order. First hit wins so we don't
	   double-action the same message. */
	const detectors: Array<() => Violation | null> = [
		() => checkMassMention(message, mods.massMention),
		() => checkLinks(message, mods.links),
		() => checkAccountAge(message, mods.accountAge),
		() => checkSpamRate(message, mods.spamRate),
		() => checkWordFilter(message, mods.wordFilter),
	]

	let hit: Violation | null = null
	for (const d of detectors) {
		try {
			hit = d()
			if (hit) break
		} catch (e) {
			Log.warn(`[automod] detector crash: ${(e as Error).message}`)
		}
	}
	if (!hit) return

	const moduleCfg = mods[hit.moduleKey]
	const action = moduleCfg.action

	/* Phase 2 hook: if moduleCfg.aiCheck === true, route through Claude
	   here BEFORE applying action. Skipped for now — Phase 1 = hardcoded. */

	await applyAction({
		message,
		cfg,
		moduleName: hit.moduleName,
		reason: hit.reason,
		configuredAction: action,
		severity: hit.severity,
		extra: hit.extra,
	})
}
