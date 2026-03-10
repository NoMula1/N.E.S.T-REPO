import { EmbedBuilder, Events, Message } from "discord.js"
import { isMediaChannel, isMediaMessage } from "../../utils/LegacyMediaChannel"
import { EventOptions } from "../../utils/RegisterEvents"

export default {
	name: Events.MessageCreate,
	once: false,
	async execute(_: EventOptions, message: Message) {

		if (isMediaChannel(message.channel) && !isMediaMessage(message)) {
			const hintDM = new EmbedBuilder()
				.setAuthor({ name: `Non-media message sent in media channel`, iconURL: message.guild?.iconURL() || undefined })
				.setDescription(`You sent a non-media message in <#${message.channelId}>.
				Use a chat channel instead.`)
				.setColor("Green")
			await message.member?.user.send({ embeds: [hintDM] }).catch((err: Error) => { })
			await message.delete()
		}

	}
}
