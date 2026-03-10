import { EmbedBuilder } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { config } from "../../../utils/config"
import { errorEmbed, handleError, sendModLogs } from "../../../utils/GenUtils"
import Case from "../../../schemas/Case"
import { Scope } from "../../../bootstrap/GlobalScope"

export default new CommandExecutor()
	.setName("deletecase")
	.setDescription("Delete a case from the database.")
	.addNumberOption(opt =>
		opt
			.setName("case_number")
			.setDescription("Enter the case number you'd like to delete.")
			.setRequired(true)
	)
	.setBasePermission({
		Level: PermissionLevel.Administrator,
		HasRole: ["1210559673791553587", "1203545417648967720"],
		/*
			1203545417648967720 = Help Forums Manager
		*/
		Scope: Scope.Admin
	})
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }

		const caseNum = interaction.options.getNumber("case_number") || 1

		const foundCase = await Case.findOne({
			guildID: interaction.guild.id,
			caseNumber: caseNum
		})
		if (!foundCase) {
			interaction.reply(errorEmbed("No case found!"))
			return
		}

		foundCase.deleteOne().then(async () => {
			const embed = new EmbedBuilder()
				.setColor("Green")
				.setDescription(`${config.successEmoji} Case \`#${caseNum}\` has been deleted.`)
			interaction.reply({ embeds: [embed] })
			await sendModLogs({
				guild: interaction.guild!,
				mod: interaction.member!,
				action: "Case Delete"
			}, {
				title: "Case Deleted",
				actionInfo: `**Mod:** <@${foundCase.modID}>\n> **Reason:** ${foundCase.reason}\n> **Case ID:** ${foundCase.caseNumber}\n> **User:** <@${foundCase.userID}>\n> **Date Issued:** <t:${Math.floor(foundCase.dateIssued! / 1000)}:d> (<t:${Math.floor(foundCase.dateIssued! / 1000)}:R>)\n> **Duration:** ${foundCase.duration}`,
				channel: interaction.channel || undefined
			})
		}).catch((err: Error) => {
			handleError(err)
			interaction.reply(errorEmbed("An error occurred while deleting the case!"))
		})
	})
