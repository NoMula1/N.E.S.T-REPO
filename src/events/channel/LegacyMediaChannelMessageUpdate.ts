import { EmbedBuilder, Events, Message } from "discord.js"
import { isMediaChannel, isMediaMessage } from "../../utils/LegacyMediaChannel"
import { EventOptions } from "../../utils/RegisterEvents"

export default {
	name: Events.MessageUpdate,
	once: false,
	async execute(_: EventOptions, _oldMessage: Message, newMessage: Message) {

		if (isMediaChannel(newMessage.channel) && !isMediaMessage(newMessage)) {
			const hintDM = new EmbedBuilder()
				.setAuthor({ name: `Media removed from media-only channel message`, iconURL: newMessage.guild?.iconURL() || undefined })
				.setDescription(`You removed media from a message in <#${newMessage.channelId}>.
				Repost the media message or send it in a chat channel instead.`)
				.setColor("Green")
			await newMessage.member?.user.send({ embeds: [hintDM] }).catch((err: Error) => { })
			await newMessage.delete()
		}

	}
}
