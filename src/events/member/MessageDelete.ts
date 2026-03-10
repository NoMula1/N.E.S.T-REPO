import { Log } from "../../utils/logging"
import mongoose from "mongoose"
import { ActivityType, ChannelType, Events, Message } from "discord.js"
import PostTemplates from "../../schemas/PostTemplates"
import { EventOptions } from "../../utils/RegisterEvents"

export default {
	name: Events.MessageDelete,
	once: false,
	async execute(_: EventOptions, message: Message) {
		if (message.channel.type !== ChannelType.GuildText) return
		if (message.channel.name.toLowerCase() !== "template-approvals") return

		const template = await PostTemplates.findOne({
			approvalMessageID: message.id,
		})
		if (!template) return

		await template.updateOne({
			approvalMessageID: "",
			waitingForApproval: false
		})
	}
}