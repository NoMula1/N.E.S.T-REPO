import { Events, TextChannel, Interaction, EmbedBuilder, Colors, ChannelType, ButtonStyle, ActionRowBuilder, ButtonBuilder, MessageFlags } from 'discord.js'
import { EventOptions } from '../../utils/RegisterEvents'
import { Log } from '../../utils/logging'
import { getGuildConfig } from '../../utils/GuildConfigCache'

const isSnowflake = (id: string | null | undefined): id is string =>
	typeof id === 'string' && /^\d{17,20}$/.test(id)

export default {
	name: Events.InteractionCreate,
	once: false,
	async execute(_: EventOptions, i: Interaction) {
		if (!i.isModalSubmit()) return
		if (!i.customId.startsWith('report-message-submit')) return
		if (!i.channel || !i.guild) return

		await i.deferReply({ flags: MessageFlags.Ephemeral })

		// Resolve reports channel from guild config
		const guildCfg = await getGuildConfig(i.guildId!)
		const reportsChannelId = guildCfg?.channels?.reports
		const reportsChannel = isSnowflake(reportsChannelId)
			? i.guild.channels.cache.get(reportsChannelId) as TextChannel | undefined
				?? await i.guild.channels.fetch(reportsChannelId).catch(() => null) as TextChannel | null
			: i.guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.name === 'reports') as TextChannel | undefined

		if (!reportsChannel) {
			Log.error(`[${i.guildId}] Missing reports channel — configure it in the NEST dashboard.`)
			await i.editReply({ content: 'The reports channel is not configured for this server. Please contact an administrator.' })
			return
		}

		// Resolve ping role from guild config (Moderator or SeniorModerator)
		const pingRoleId = guildCfg?.roles?.Moderator || guildCfg?.roles?.AssistantModerator
		const pingMention = isSnowflake(pingRoleId) ? `<@&${pingRoleId}>` : '@here'

		const messageId = i.customId.split('-')[3]
		const message = await i.channel.messages.fetch(messageId).catch(() => null)
		if (!message) {
			await i.editReply({ content: 'Could not find the reported message.' })
			return
		}

		await message.react('⚠').catch(() => {})
		await i.editReply({ content: `User <@${message.author.id}> has been reported and mods have been notified. Thanks for helping keep the server safe.` })

		await (reportsChannel as TextChannel).send({
			content: pingMention,
			embeds: [
				new EmbedBuilder()
					.setTitle('Message Report')
					.setDescription(
						`**Reporter:** <@${i.user.id}>\n**Reason:**\n\`\`\`\n${i.fields.getTextInputValue('reason')}\n\`\`\`\n**Jump:** ${message.url}\n**Message:**\n\`\`\`\n${message.content.replace(/`/g, '\\`')}\n\`\`\``
					)
					.setColor(Colors.Red)
			],
			components: [
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId('message-report-reviewed')
						.setLabel('Mark as Resolved')
						.setStyle(ButtonStyle.Success)
				) as any
			]
		})
	}
}
