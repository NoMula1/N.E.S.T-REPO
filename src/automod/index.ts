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
import { maybeQueueForAi, confirmViolationWithAi } from "./aiScanner"

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

	if (hit) {
		const moduleCfg = mods[hit.moduleKey]
		const action = moduleCfg.action

		let finalReason = hit.reason
		let aiExtra: Record<string, unknown> = {}

		/* If the module has aiCheck enabled, ask Claude to confirm before
		   applying the action. Filters false positives + adds semantic
		   reasoning to obvious Layer 1 hits. */
		if (moduleCfg.aiCheck) {
			const verdict = await confirmViolationWithAi(message, hit.moduleName, hit.reason)
			aiExtra = { aiConfirm: verdict.confirm, aiReason: verdict.aiReason }
			if (!verdict.confirm) {
				Log.info(`[automod] AI rejected Layer 1 hit (${hit.moduleName}): ${verdict.aiReason}`)
				return  // skip action — AI thinks it's a false positive
			}
			finalReason = `${hit.reason} (AI confirmed: ${verdict.aiReason})`
		}

		await applyAction({
			message,
			cfg,
			moduleName: hit.moduleName,
			reason: finalReason,
			configuredAction: action,
			severity: hit.severity,
			extra: { ...hit.extra, ...aiExtra },
		})
		return
	}

	/* Layer 1 didn't fire. If AI Moderation is enabled in sample_all or
	   scan_all mode, queue this message for the AI scanner. The scanner
	   batches messages and flushes asynchronously — no blocking here. */
	if (cfg.automod.aiAutomod?.enabled && cfg.automod.aiAutomod.mode !== "confirm_layer1") {
		await maybeQueueForAi(message, cfg).catch(e => Log.warn(`[automod] AI queue err: ${(e as Error).message}`))
	}
}
