// TODO: Export a list of media channel ids and a utility to detect embeddable media in a message

import { Channel, Message, TextChannel } from "discord.js"

export function isMediaChannel(channel: Channel): boolean {
	return channel instanceof TextChannel && (channel as TextChannel).name.startsWith('cool-')
}

export function isMediaMessage(message: Message): boolean {
	// Check for attachments or embeddable content
	return (Array.from(message.attachments).length > 0) || message.embeds.length > 0
}
