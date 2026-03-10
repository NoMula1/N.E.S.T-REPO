import { CategoryChannel, ChannelType, Events, Message, TextChannel } from "discord.js"
import { appendFileSync, writeFileSync } from "fs"
import path, { resolve } from "path"
import { EventOptions } from "../../utils/RegisterEvents"

export default {
	name: Events.MessageCreate,
	once: false,
	async execute(_: EventOptions, message: Message) {
		const channel = message.channel
		if (!channel.isTextBased())
			return
		if (channel.type !== ChannelType.GuildText)
			return
		if (channel.name !== "one-word-story")
			return


	}
}