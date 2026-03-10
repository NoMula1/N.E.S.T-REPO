import { EmbedBuilder, PermissionFlagsBits } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { errorEmbed } from "../../../utils/GenUtils"
import Case from "../../../schemas/Case"
import { config } from "../../../utils/config"
import { Scope } from "../../../bootstrap/GlobalScope"

export default new CommandExecutor()
	.setName("case")
	.setDescription("View a specific case from a case number.")
	.addNumberOption(opt =>
		opt
			.setName("case_number")
			.setDescription("Enter the case number you'd like to view.")
			.setRequired(true)
	)
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
	.setBasePermission({
		Level: PermissionLevel.AssistantModerator,
		HasRole: ["1138680448248188948", // Staff
			  "1480436503187423342"], // Marketplace Department 
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

		const caseEmbed = new EmbedBuilder()
			.setAuthor({ name: `Case #${foundCase.caseNumber}` })
			.setDescription(`${config.bulletpointEmoji} **User:** <@${foundCase.userID}>
			${config.bulletpointEmoji} **Mod:** <@${foundCase.modID}>
			${config.bulletpointEmoji} **Reason:** ${foundCase.reason}
			${config.bulletpointEmoji} **Expired:** ${foundCase.active ? "No" : "Yes"}
			${config.bulletpointEmoji} **Duration:** ${foundCase.duration}
			${config.bulletpointEmoji} **Date Issued:** <t:${Math.floor(foundCase.dateIssued! / 1000)}:d> (<t:${Math.floor(foundCase.dateIssued! / 1000)}:R>)`)
			.setColor("Blurple")
			.setTimestamp()
			.setFooter({ text: `Requested by: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() || undefined })
		interaction.reply({ embeds: [caseEmbed] })
	})
