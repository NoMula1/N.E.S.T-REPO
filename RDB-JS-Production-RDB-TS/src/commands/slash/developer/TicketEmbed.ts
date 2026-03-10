import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"

export default new CommandExecutor()
	.setName("sendticketembed")
	.setDescription("Send the \"Open a Ticket\" embed.")
	.setBasePermission({
		Level: PermissionLevel.Administrator,
	})
	.addChannelOption(opt =>
		opt
			.setName("channel")
			.setDescription("Input a channel to send the embed.")
			.setRequired(true)
	)
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }

		const channel = interaction.options.getChannel("channel")
		if (!channel || channel.type !== ChannelType.GuildText) {
			interaction.reply({ content: "Invalid channel provided!" })
			return
		}
		const webhook = await channel.createWebhook({ name: "Ticket System", avatar: interaction.guild.iconURL() || undefined })

		const ticketsButton = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder()
					.setStyle(ButtonStyle.Primary)
					.setLabel("Open Ticket")
					.setCustomId("open_ticket")
					.setEmoji("🎟"),
				new ButtonBuilder()
					.setStyle(ButtonStyle.Primary)
					.setLabel("Internal Affairs")
					.setCustomId("open_internal_affair")
					.setEmoji("🎟")
			)

		const ticketEmbed = new EmbedBuilder()
			.setTitle("Contact Staff")
			.setDescription(`Need to contact staff to report someone, inquire about the server, or ask about partnerships? Here's the place to do it!
			https://nohello.net/`)
			.addFields(
				{
					name: 'Important Information',
					value: `\n- If you have opened a ticket accidentally, please leave a short message and close it.\n`
						+ `- Do **not** beg for roles\n`
						+ `- Please do not ping staff, we have already been alerted\n\n`
				},
				{
					name: 'What are Internal Affairs?',
					value: `The Internal Affairs button is a way for you to get in contact with NIGHTHAWK SERVERS Internal Reviewers. All content in these tickets are as confidential as possible.`
						+ ` **Use this feature to report staff misconduct or other staff grievances.**`
				}
			)
			.setColor("Green")
		webhook.send({ embeds: [ticketEmbed], components: [ticketsButton] }).catch(() => { })
		interaction.reply({ content: "Embed sent!" })
	})