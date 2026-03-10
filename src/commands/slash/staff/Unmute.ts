import { EmbedBuilder } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { errorEmbed, handleError, incrimentCase, sendModLogs } from "../../../utils/GenUtils"
import Case from "../../../schemas/Case"
import { config } from "../../../utils/config"
import { Scope } from "../../../bootstrap/GlobalScope"

export default new CommandExecutor()
	.setName("unmute")
	.setDescription("Remove a mute from a user.")
	.addUserOption(opt =>
		opt.setName("user")
			.setDescription("Select the user you would like to unban.")
			.setRequired(true)
	)
	.addStringOption(opt =>
		opt.setName("reason")
			.setDescription("Enter the reason for the unban.")
			.setRequired(true)
	)
	.setBasePermission({
		Level: PermissionLevel.AssistantModerator,
		HasRole: ['1243687914865557546', '1203545488008155136'],
		/**
		 * 1243687914865557546 = Trial Help Moderator
		 * 1203545488008155136 = Scam Investigator
		 */
		Scope: Scope.Admin
	})
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }

		const user = interaction.options.getMember("user")
		const reason = interaction.options.getString("reason")
		if (!user || !reason) {
			interaction.reply(errorEmbed("Invalid member!"))
			return
		}

		if (!user.communicationDisabledUntil) {
			interaction.reply(errorEmbed("This user isn't muted!"))
			return
		}


		await user.timeout(null, `Mod: ${interaction.user.username}\nReason: ${reason}`).then(async () => {
			const caseNumber = await incrimentCase(interaction.guild)
			const newCase = new Case({
				guildID: interaction.guild.id,
				userID: user.id,
				modID: interaction.user.id,
				caseNumber: caseNumber,
				caseType: "UNMUTE",
				reason: reason,
				duration: "None",
				durationUnix: 0,
				active: null,
				dateIssued: Date.now()
			})
			newCase.save().catch((err: Error) => {
				handleError(err)
			})

			await Case.findOneAndUpdate({
				guildID: interaction.guild.id,
				userID: user.id,
				caseType: "MUTE",
				active: true,
			}, {
				active: false
			})

			const unmutedEmbed = new EmbedBuilder()
				.setDescription(`**Case:** #${caseNumber} | **Mod:** ${interaction.user.username} | **Reason:** ${reason}`)
				.setColor("Green")
			await interaction.reply({ embeds: [unmutedEmbed], content: `${config.arrowEmoji} **${user.user.username}** has been unmuted.` })

			await sendModLogs({ guild: interaction.guild!, mod: interaction.member!, targetUser: user.user, action: "Unmute" }, { title: "User Unmuted", actionInfo: `**Reason:** ${reason}\n> **Case ID:** ${caseNumber}`, channel: interaction.channel || undefined })
		}).catch(async (err: Error) => {
			handleError(err)
			await interaction.reply(errorEmbed(`Something went wrong!\n\n\`${err.message}\``))
		})

	})