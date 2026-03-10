import { EmbedBuilder, PermissionFlagsBits } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { errorEmbed, handleError, incrimentCase, sendModLogs } from "../../../utils/GenUtils"
import Case from "../../../schemas/Case"
import Bans from "../../../schemas/Bans"
import { config } from "../../../utils/config"
import { Scope } from "../../../bootstrap/GlobalScope"

export default new CommandExecutor()
	.setName("unban")
	.setDescription("Remove a ban from a user.")
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
	.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
	.setBasePermission({
		Level: PermissionLevel.Moderator,
		HasRole: ['1480435758845395045', '1474515140841046231', '1474515390418780330', '1474514887609680124'],
		/**
		 * 1480435758845395045 = Marketplace Moderator
		 * 1474515140841046231 = Scam Investigator
		 * 1474515390418780330 = Trial Scam Investigator
		 * 1474514887609680124 = Scam Investigations Manager
		 */
		Scope: Scope.Admin
	})
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }

		const user = interaction.options.getUser("user")
		const reason = interaction.options.getString("reason")
		if (!user || !reason) return


		await interaction.guild.bans.remove(user.id, `Mod: ${interaction.user.username}\nReason: ${reason}`).then(async () => {
			const caseNumber = await incrimentCase(interaction.guild)
			const newCase = new Case({
				guildID: interaction.guild.id,
				userID: user.id,
				modID: interaction.user.id,
				caseNumber: caseNumber,
				caseType: "UNBAN",
				reason: reason,
				duration: "None",
				durationUnix: 0,
				active: null,
				dateIssued: Date.now()
			})
			newCase.save().catch((err: Error) => {
				handleError(err)
			})

			const firstBan = await Case.findOneAndUpdate({
				guildID: interaction.guild.id,
				userID: user.id,
				caseType: "BAN",
				active: true,
			}, {
				active: false
			})

			await Bans.deleteMany({
				guildID: interaction.guild.id,
				userID: user.id
			})

			const unbannedEmbed = new EmbedBuilder()
				.setDescription(`**Case:** #${caseNumber} | **Mod:** ${interaction.user.username} | **Reason:** ${reason}`)
				.setColor("Green")
			await interaction.reply({ embeds: [unbannedEmbed], content: `${config.arrowEmoji} **${user.username}** has been unbanned.` })

			await sendModLogs({ guild: interaction.guild!, mod: interaction.member!, targetUser: user, action: "Unban" }, { title: "User Unbanned", actionInfo: `**Reason:** ${reason}\n> **Case ID:** ${caseNumber}`, channel: interaction.channel || undefined })
		}).catch(async (err: Error) => {
			handleError(err)
			await interaction.reply(errorEmbed(`Something went wrong!\n\n\`${err.message}\``))
		})

	})