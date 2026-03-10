import { ActionRowBuilder, ModalBuilder, Role, TextInputBuilder, TextInputStyle } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { errorEmbed } from "../../../utils/GenUtils"
import Tickets from "../../../schemas/Tickets"

export default new CommandExecutor()
	.setName("close")
	.setDescription("Close the current ticket.")
	.setBasePermission({
		Level: PermissionLevel.None,
	})
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }

		const foundTicket = await Tickets.findOne({
			guildID: interaction.guild.id,
			channelID: interaction.channel?.id,
			status: true,
		})
		if (!foundTicket) {
			interaction.reply(errorEmbed("This channel is not a valid ticket."))
			return
		}

		if (interaction.user.id !== foundTicket.creatorID) {
			if (interaction.member.guild.roles.cache.find((r: Role) => r.name.toLowerCase() === "assistant moderator")?.position! > interaction.member.guild.roles.highest.position && interaction.user.id !== foundTicket.creatorID) {
				interaction.reply(errorEmbed("You do not have permission to close this ticket."))
				return
			}
		}

		const postForm = new ModalBuilder()
			.setCustomId("modal_close_reason")
			.setTitle("Enter a Reason")
		const postInputs = [
			new TextInputBuilder()
				.setCustomId('close_reason')
				.setLabel("Reason")
				.setPlaceholder("Ticket resolved.")
				.setRequired(true)
				.setMaxLength(250)
				.setStyle(TextInputStyle.Paragraph),
		]
		for (const input of postInputs)
			postForm.addComponents(new ActionRowBuilder<TextInputBuilder>().setComponents(input))
		await interaction.showModal(postForm)


	})