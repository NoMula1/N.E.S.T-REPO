import { ChannelType, Events, ThreadChannel } from 'discord.js'
import { EventOptions } from '../../utils/RegisterEvents'
import { getGuildConfig } from '../../utils/GuildConfigCache'

const isSnowflake = (id: string | null | undefined): id is string =>
	typeof id === 'string' && /^\d{17,20}$/.test(id)

export default {
	name: Events.ThreadCreate,
	once: false,
	async execute(_: EventOptions, thread: ThreadChannel) {
		if (!thread.parent || thread.parent.type !== ChannelType.GuildForum) return
		if (!thread.guildId) return

		// Match against the configured help forum channel ID
		const guildCfg = await getGuildConfig(thread.guildId)
		const helpForumId = guildCfg?.channels?.helpForum

		const isHelpForum = isSnowflake(helpForumId)
			? thread.parentId === helpForumId
			: thread.parent.name.toLowerCase() === 'help' // fallback by name if not configured

		if (!isHelpForum) return

		// Build the welcome message — mention the marketplace channels if configured
		const hiringId  = guildCfg?.channels?.hiring
		const forHireId = guildCfg?.channels?.forHire
		const sellingId = guildCfg?.channels?.selling

		const marketplaceRef = [hiringId, forHireId, sellingId].filter(isSnowflake).map(id => `<#${id}>`).join(', ')
		const marketplaceNote = marketplaceRef.length > 0
			? `If you have a **Hiring**, **For-Hire**, or **Selling** post, visit ${marketplaceRef} and close this post.`
			: `If you have a **Hiring**, **For-Hire**, or **Selling** post, please use the marketplace channels and close this post.`

		await thread.send({
			content: `Hey <@${thread.ownerId}>, thanks for creating a help post! To make sure you receive a response, please review the guide below:\n- Ensure your post has good grammar and readability.\n- Make sure to provide **full screenshots** of any code output, if applicable.\n- State all of the troubleshooting steps you have already attempted.\n- Ensure you have an issue that __has a solution__; for learning, consider searching existing resources first.\n- ${marketplaceNote}`
		}).catch(() => {})
	}
}
