import { EmbedBuilder } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { errorEmbed, getLengthFromString, handleError, incrimentCase, sendModLogs } from "../../../utils/GenUtils"
import Case from "../../../schemas/Case"
import { config } from "../../../utils/config"

export default new CommandExecutor()
	.setName("mute")
	.setDescription("Issue a mute to a user.")
	.addUserOption(opt =>
		opt
			.setName("user")
			.setDescription("Select the user you would like to mute.")
			.setRequired(true)
	)
	.addStringOption(opt =>
		opt
			.setName("length")
			.setDescription("Length for the mute.")
			.setRequired(true)
	)
	.addStringOption(opt =>
		opt
			.setName("reason")
			.setDescription("Enter the reason for the mute.")
			.setRequired(true)
	)
	.setBasePermission({
		Level: PermissionLevel.AssistantModerator,
		HasRole: ['1480437092361175163', '1474515140841046231', '1474515390418780330', '1474514887609680124']
		/**
		 * 1480437092361175163 = Trial Help Forums Moderator
		 * 1474515140841046231 = Scam Investigator
		 * 1474515390418780330 = Trial Scam Investigator
		 * 1474514887609680124 = Scam Investigations Manager
		*/
	})
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }

		const user = interaction.options.getUser("user")
		const member = interaction.options.getMember("user")
		const reason = interaction.options.getString("reason")
		const timeOpt = interaction.options.getString("length") || "5m"
		const length = await getLengthFromString(timeOpt)
		if (!length[0]) {
			interaction.reply(errorEmbed("Invalid mute length! Ex. `1h, 7d`"))
			return
		}
		if (!user || !reason) return

		if (!member) {
			interaction.reply(errorEmbed("This user is not in the server!"))
			return
		}

		if (interaction.member.roles.highest.position <= member.roles.highest.position || interaction.user.id == member.id) {
			interaction.reply(errorEmbed("You are unable to issue a warning to this user."))
			return
		}

		await member.timeout(length[0] * 1000, `Mod: ${interaction.user.username}\nReason: ${reason}`).then(async () => {

			const caseNumber = await incrimentCase(interaction.guild)

			const newCase = new Case({
				guildID: interaction.guild.id,
				userID: user.id,
				modID: interaction.user.id,
				caseNumber: caseNumber,
				caseType: "MUTE",
				reason: reason,
				duration: length[1],
				durationUnix: (Math.floor(Date.now() / 1000) + length[0]),
				active: true,
				dateIssued: Date.now()
			})
			newCase.save().catch((err: Error) => {
				handleError(err)
			})

			const warns = await Case.countDocuments({
				guildID: interaction.guild.id,
				userID: user.id,
				caseType: "WARN",
				active: true,
			})

			const mutedEmbed = new EmbedBuilder()
				.setDescription(`**Case:** #${caseNumber} | **Mod:** ${interaction.user.username} | **Reason:** ${reason} | **Length:** ${length[1]}`)
				.setColor("Green")
			await interaction.reply({ content: `${config.arrowEmoji} **${user.username}** has been muted. (**${warns}** warns)`, embeds: [mutedEmbed] })

			const mutedDM = new EmbedBuilder()
				.setAuthor({ name: `You have been muted`, iconURL: interaction.guild.iconURL() || undefined })
				.setDescription(`${config.bulletpointEmoji} **Reason:** ${reason}
				${config.bulletpointEmoji} **Length:** ${length[1]}
				${config.bulletpointEmoji} **Case Number:** #${caseNumber}`)
				.setColor("Green")
				.setTimestamp()
			user.send({ embeds: [mutedDM] }).catch((err: Error) => { })

			await sendModLogs({ guild: interaction.guild!, mod: interaction.member!, targetUser: user, action: "Mute" }, { title: "User Muted", actionInfo: `**Reason:** ${reason}\n**Length:**${length[1]}\n> **Case ID:** ${caseNumber}`, channel: interaction.channel || undefined })

		}).catch(async (err: Error) => {
			handleError(err)
			await interaction.reply(errorEmbed(`Something went wrong!\n\n\`${err.message}\``))
		})
	})
