import { Cron } from 'croner'
import { Log } from '../../utils/logging'
import { Events, Client, TextChannel } from 'discord.js'
import { getGuildConfig } from '../../utils/GuildConfigCache'
import Qotd from '../../schemas/Qotd'
import { EventOptions } from '../../utils/RegisterEvents'

export default {
	name: Events.ClientReady,
	once: false,
	async execute(_: EventOptions, client: Client) {
		// *(minutes) *(hours) *(day of the month) *(month of the year) *(day of the week)
		Cron('00 12 * * *', async () => {
			const mostRecentQuestion = await Qotd.findOne().sort({ createdAt: -1 })
			if (!mostRecentQuestion) {
				Log.error("Cant find any questions inside of the DB")
				return
			}

			const user = client.users.cache.get(mostRecentQuestion.userID)

			// Post to every linked guild that has QOTD enabled + a qotd channel configured
			for (const [guildId] of client.guilds.cache) {
				try {
					const config = await getGuildConfig(guildId)
					if (!config?.features?.qotd || !config?.channels?.qotd) continue

					const channelId = config.channels.qotd
					let channel = client.channels.cache.get(channelId) as TextChannel | undefined
					if (!channel) {
						channel = await client.channels.fetch(channelId).catch(() => null) as TextChannel | null ?? undefined
					}
					if (!channel) {
						Log.error(`[${guildId}] Failed to fetch QOTD channel ${channelId}`)
						continue
					}

					const webhook = await channel.createWebhook({
						name: user?.displayName ?? 'NEST',
						avatar: user?.displayAvatarURL() ?? undefined,
					})

					const sent = await webhook.send({ content: mostRecentQuestion.question })
					await sent.startThread({
						name: `${mostRecentQuestion.question.slice(0, 80)} (${new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })})`,
						autoArchiveDuration: 60,
					}).catch((err) => Log.error(`[${guildId}] Failed to start QOTD thread: ${err}`))

					await webhook.delete().catch(() => {})
				} catch (err) {
					Log.error(`[${guildId}] QOTD error: ${err}`)
				}
			}

			// Delete question after all guilds have received it
			await Qotd.findByIdAndDelete(mostRecentQuestion._id).catch((err) =>
				Log.error(`Failed to delete QOTD from DB: ${err}`)
			)
		})
	}
}
