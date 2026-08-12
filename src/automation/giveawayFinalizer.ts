import Giveaway from "../schemas/Giveaway"
import ScheduledTask from "../schemas/ScheduledTask"
import { Client } from "discord.js"
import { pickWinners } from "../utils/giveawayUtils"
import { Log } from "../utils/logging"

export async function finalizeGiveaway(client: Client, giveawayId: string, scheduledTask: any) {
	const giveaway = await Giveaway.findById(giveawayId).lean()
	if (!giveaway) {
		// Mark the scheduled task as fired to avoid repeats
		await ScheduledTask.findByIdAndUpdate((scheduledTask as any)?._id, { $set: { status: "fired", nextRunAt: null } }).catch(() => {})
		Log.warn(`[giveaway] finalize called but giveaway ${giveawayId} not found.`)
		return
	}
	if (giveaway.status !== "active") {
		// Nothing to do; mark scheduled task fired
		await ScheduledTask.findByIdAndUpdate((scheduledTask as any)?._id, { $set: { status: "fired", nextRunAt: null } }).catch(() => {})
		Log.info(`[giveaway] giveaway ${giveawayId} already ${giveaway.status}; skipping finalization.`)
		return
	}

	const entrants = (giveaway.entrants || []).slice()
	const winners = pickWinners(entrants, giveaway.winnersCount)

	try {
		const channel = await client.channels.fetch(giveaway.channelId).catch(() => null)
		const mentionList = winners.length === 0 ? "No valid entrants." : winners.map(id => `<@${id}>`).join(", ")
		const text = winners.length === 0
			? `Giveaway **${giveaway.title}** ended — no winners (no valid entrants).`
			: `🎉 Congratulations ${mentionList} — you won **${giveaway.title}**!`

		if (channel && (channel as any).isTextBased && giveaway.messageId) {
			await (channel as any).send({ content: text }).catch((e) => Log.warn(`[giveaway] announce send failed: ${String(e)}`))
			// Attempt to edit original message embed to mark ended
			try {
				const msg = await (channel as any).messages.fetch(giveaway.messageId).catch(() => null)
				if (msg) {
					const embed = msg.embeds[0]?.toJSON ? msg.embeds[0].toJSON() : msg.embeds[0]
					if (embed) {
						if (!embed.footer) embed.footer = {}
						embed.footer.text = `Giveaway ID: ${giveaway._id} — Ended`
						await msg.edit({ embeds: [embed] }).catch(() => {})
					}
				}
			} catch (e) {
				Log.warn(`[giveaway] failed to edit original message: ${String(e)}`)
			}
		} else if (channel && (channel as any).isTextBased) {
			await (channel as any).send({ content: text }).catch((e) => Log.warn(`[giveaway] announce send failed: ${String(e)}`))
		} else {
			Log.warn(`[giveaway] channel ${giveaway.channelId} not available to announce winners for giveaway ${giveawayId}`)
		}

		// Update giveaway status and scheduled task
		await Giveaway.findByIdAndUpdate(giveawayId, { $set: { status: "ended" } }).catch(() => {})
		await ScheduledTask.findByIdAndUpdate((scheduledTask as any)?._id, { $set: { status: "fired", nextRunAt: null } }).catch(() => {})
		Log.info(`[giveaway] finalized ${giveawayId} winners=${winners.join(",")}`)
	} catch (e) {
		Log.warn(`[giveaway] finalize failed: ${(e as Error).message}`)
		throw e
	}
}
