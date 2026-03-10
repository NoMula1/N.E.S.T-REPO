
import { ChannelType, Events, ThreadChannel } from "discord.js"
import { EventOptions } from "../../utils/RegisterEvents"

export default {
	name: Events.ThreadCreate,
	once: false,
	async execute(_: EventOptions, thread: ThreadChannel) {
		if (!thread.parent || thread.parent.type !== ChannelType.GuildForum) return
		if (thread.parent.name !== 'help') return

		await thread.send({
			content: `Hey <@${thread.ownerId}>, thanks for creating a help post! To make sure you receive a response, you can view the guide below!\n- Ensure your post has good grammar and readability.\n- Make sure to provide **full screenshots** of any code output, if applicable.\n- State all of the troubleshooting steps you have already attempted.\n- Ensure you have an issue that __has a solution__; for learning, you can visit <#1293784946539892860>.\n- If you have a **Hiring**, **For-Hire**, or **Selling** post, visit <#1243129204770603018> and close the post.`
		}).catch(() => { })
	}
}