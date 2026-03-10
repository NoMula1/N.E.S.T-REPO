import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, TextChannel } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"

export default new CommandExecutor()
	.setName("mock_ticket_embeds")
	.setDescription("Mock the tickets embed with buttons")
	.setBasePermission({
		Level: PermissionLevel.Developer,
	})
	.setExecutor(async (interaction) => {
		const embed = new EmbedBuilder()
			.setTitle("Contact Staff")
			.setColor("Green")
			.addFields(
				{
					name: 'Important Information',
					value: `\n- If you have opened a ticket accidentally, please leave a short message and close it.\n`
						+ `- Do **not** beg for roles\n`
						+ `- Please do not ping staff, we have already been alerted\n\n`
				},
				{
					name: 'What are Internal Affairs?',
					value: `The Internal Affairs button is a way for you to get in contact with Internal Reviewers, instead of regular staff. All content in these tickets are as confidential as possible.`
						+ ` **Use this feature to report staff misconduct or other staff grievances.**`
				}
			)
			.setDescription(
				`Need to contact staff to report someone, inquire about the server, or ask about partnerships? Here's the place to do it!\nhttps://nohello.net/`
			)

		const embed2 = new EmbedBuilder()
			.setTitle('New Internal Affair Report')
			.setColor("Red")
			.setDescription(`This feature will open a ticket, used to report staff misconduct or staff grievances. This ticket will only be able to be viewed by Internal Reviewers.`
				+ `\n\n**Click "Open Ticket" below to acknowledge this feature's intended usage**, and to open an Internal Affair Ticket.`)

		const actionRow = new ActionRowBuilder<ButtonBuilder>()
		const actionRow2 = new ActionRowBuilder<ButtonBuilder>()
		const openTicketButton = new ButtonBuilder()
			.setLabel('Open Ticket')
			.setCustomId('mock-1')
			.setStyle(ButtonStyle.Primary)
		const internalAffairsButton = new ButtonBuilder()
			.setLabel('Internal Affairs')
			.setCustomId('mock-2')
			.setStyle(ButtonStyle.Primary)
		const nevermindButton = new ButtonBuilder()
			.setLabel('Nevermind')
			.setCustomId("mock-3")
			.setStyle(ButtonStyle.Danger)
		const openTicketConfirmationButton = new ButtonBuilder()
			.setLabel('Open Ticket')
			.setCustomId('mock-4')
			.setStyle(ButtonStyle.Primary)
		actionRow.addComponents(
			openTicketButton,
			internalAffairsButton
		)
		actionRow2.addComponents(
			nevermindButton,
			openTicketConfirmationButton
		)

		await interaction.reply({
			ephemeral: true,
			content: 'Sent'
		})
		await (interaction.channel as TextChannel|null)?.send({
			embeds: [
				embed
			],
			components: [
				actionRow
			]
		})
		await (interaction.channel as TextChannel|null)?.send({
			embeds: [
				embed2
			],
			components: [
				actionRow2
			]
		})
	})