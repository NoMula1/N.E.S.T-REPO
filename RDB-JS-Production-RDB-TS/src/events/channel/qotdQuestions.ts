import { Cron } from 'croner'
import { Log } from '../../utils/logging'
import { Events, Client, TextChannel } from 'discord.js'
import { default as channelLookup, Channel } from '../../utils/channels'
import Qotd from '../../schemas/Qotd'
import { EventOptions } from '../../utils/RegisterEvents'

export default {
	name: Events.ClientReady,
	once: false,
	async execute(_: EventOptions, client: Client) {

		const channelId = channelLookup(Channel.QOTD)
		let channel = client.channels.cache.get(channelId) as TextChannel
		if (!channel) {
			try {
				channel = await client.channels.fetch(channelId) as TextChannel
			} catch (error) {
				Log.error(`Failed to fetch QOTD channel: ${error}`)
				return
			}
		}
		// *(minutes) *(hours) *(day of the month) *(month of the year) *(day of the week)
		Cron('00 12 * * *', async () => {
			const mostRecentQuestion = await Qotd.findOne().sort({ createdAt: -1 })
			if (!mostRecentQuestion) {
				Log.error("Cant find any questions inside of the DB")
				return
			}
			const user = client.users.cache.get(mostRecentQuestion.userID)
			const roleID = '726669272209686589'
			const webhook = await channel.createWebhook({ name: `${user?.displayName}`, avatar: `${user?.displayAvatarURL()}` })
			webhook.send({ content: ` <@&${roleID}> ${mostRecentQuestion.question}`, allowedMentions: { roles: [roleID] } }).then(async message => {

				await message.startThread({
					name: `${mostRecentQuestion.question} (${new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })})`,
					autoArchiveDuration: 60
				}
				)

				try {
					await Qotd.findByIdAndDelete(mostRecentQuestion._id)
				} catch (err) {
					Log.error(`Failed to delete question from the DB: ${err}`)
				}

				webhook.delete()
			})
		}
		)
	}
}



