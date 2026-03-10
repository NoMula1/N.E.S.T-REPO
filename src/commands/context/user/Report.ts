import { ActionRowBuilder, ApplicationCommandType, Colors, EmbedBuilder, MessageContextMenuCommandInteraction, ModalBuilder, PermissionFlagsBits, TextChannel, TextInputBuilder, TextInputStyle } from "discord.js"
import { PermissionLevel } from "../../../utils/CommandExecutor"
import { MessageContextCommandExecutor } from "../../../utils/ContextCommandExecutor"
import ContextReport from "../../../schemas/ContextReport"
import { client } from "../../../Core"
const cooldown = new Map<string, boolean>()
let globalUsages = 0

export default new MessageContextCommandExecutor()
	.setName("Report Message")
	.setExecutor(async (interaction: MessageContextMenuCommandInteraction) => {
		if (cooldown.get(interaction.user.id)) {
			await interaction.reply({
				ephemeral: true,
				embeds: [
					new EmbedBuilder()
						.setTitle('Under Cooldown')
						.setColor("Red")
						.setDescription('This command is under cooldown for you! Please wait before using it again.')
				]
			})
			return
		}
		if (globalUsages >= 3) {
			await interaction.reply({
				ephemeral: true,
				embeds: [
					new EmbedBuilder()
						.setTitle('Under Cooldown')
						.setColor("Red")
						.setDescription('This command is under cooldown for the entire server! If you need immediate assistance, try pinging an online moderator.')
				]
			})
			return
		}
		await interaction.showModal(
			new ModalBuilder()
				.setCustomId('report-message-submit-' + interaction.targetMessage.id)
				.setTitle(`Report Message Info`)
				.addComponents(
					new ActionRowBuilder<TextInputBuilder>().addComponents(
						new TextInputBuilder()
							.setCustomId('reason')
							.setLabel('Report Reason')
							.setMinLength(5)
							.setRequired(true)
							.setStyle(TextInputStyle.Paragraph)
					)
				)
	)
	setTimeout(()=>{
			globalUsages -= 1
			cooldown.delete(interaction.user.id)
		}, 900000)
	})
