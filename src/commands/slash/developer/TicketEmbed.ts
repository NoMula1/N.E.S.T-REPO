import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { getGuildConfig } from "../../../utils/GuildConfigCache"

const TICKET_BUTTONS = [
	{ configKey: 'ticketsCategoryGeneral',  customId: 'open_ticket_general',  label: 'General Support',       emoji: '🎟' },
	{ configKey: 'ticketsCategoryTrading',  customId: 'open_ticket_trading',  label: 'Trading/Scam Report',   emoji: '🚨' },
	{ configKey: 'ticketsCategoryMarket',   customId: 'open_ticket_market',   label: 'Market Scam Report',    emoji: '🏪' },
	{ configKey: 'ticketsCategoryBusiness', customId: 'open_ticket_business', label: 'Business Inquiries',    emoji: '💼' },
	{ configKey: 'internalAffairs',         customId: 'open_internal_affair', label: 'Internal Affairs',      emoji: '🔒' },
]

export default new CommandExecutor()
	.setName("sendticketembed")
	.setDescription("Send the \"Open a Ticket\" embed.")
	.setBasePermission({ Level: PermissionLevel.Administrator })
	.addChannelOption(opt =>
		opt.setName("channel").setDescription("Channel to send the embed in.").setRequired(true)
	)
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) {
			interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true })
			return
		}

		const channel = interaction.options.getChannel("channel")
		if (!channel || channel.type !== ChannelType.GuildText) {
			interaction.reply({ content: "Invalid channel provided!", ephemeral: true })
			return
		}

		const guildCfg = await getGuildConfig(interaction.guildId!)
		const channels = guildCfg?.channels ?? {}

		// Build one button per configured ticket category
		const buttons: ButtonBuilder[] = TICKET_BUTTONS
			.filter(b => !!(channels as any)[b.configKey])
			.map(b =>
				new ButtonBuilder()
					.setStyle(ButtonStyle.Primary)
					.setLabel(b.label)
					.setCustomId(b.customId)
					.setEmoji(b.emoji)
			)

		if (buttons.length === 0) {
			interaction.reply({ content: "No ticket categories are configured yet. Set them in the NEST dashboard (Channels → Ticket Categories) first.", ephemeral: true })
			return
		}

		// Discord allows max 5 buttons per row; split into rows of 5
		const rows: ActionRowBuilder<ButtonBuilder>[] = []
		for (let i = 0; i < buttons.length; i += 5) {
			rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons.slice(i, i + 5)))
		}

		const ticketEmbed = new EmbedBuilder()
			.setTitle("Contact Staff")
			.setDescription(
				`Need to contact staff to report someone, inquire about the server, or ask about partnerships? Here's the place to do it!\n` +
				`https://nohello.net/`
			)
			.addFields(
				{
					name: 'Important Information',
					value: `- If you opened a ticket by mistake, leave a short message and close it.\n`
						+ `- Do **not** beg for roles\n`
						+ `- Please do not ping staff, we have already been alerted`
				},
				{
					name: 'What are Internal Affairs?',
					value: `Use the Internal Affairs button to report staff misconduct or other staff grievances. `
						+ `All content in these tickets is kept as confidential as possible. `
						+ `**Use this feature to report staff misconduct or other staff grievances.**`
				}
			)
			.setColor("Green")

		const webhook = await channel.createWebhook({ name: "Ticket System", avatar: interaction.guild.iconURL() || undefined })
		await webhook.send({ embeds: [ticketEmbed], components: rows as any }).catch(() => {})
		interaction.reply({ content: `Embed sent to <#${channel.id}> with ${buttons.length} button(s).`, ephemeral: true })
	})
