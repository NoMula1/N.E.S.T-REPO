/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable no-case-declarations */
import { EmbedBuilder, PermissionsBitField, Role } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { errorEmbed, getLengthFromString, handleError, incrimentCase, sendModLogs } from "../../../utils/GenUtils"
import Case from "../../../schemas/Case"
import RoleBans from "../../../schemas/RoleBans"
import { config } from "../../../utils/config"
import { Scope } from "../../../bootstrap/GlobalScope"

export default new CommandExecutor()
	.setName("roleban")
	.setDescription("Ban a user from using server features.")
	.setBasePermission({
		Level: PermissionLevel.Moderator,
		HasRole: ['1474515140841046231', '1474515390418780330', '1474514887609680124', '1480436761938104380'],
		/**
		 * 1474515140841046231 = Scam Investigator
		 * 1474515390418780330 = Trial Scam Investigator
		 * 1474514887609680124 = Scam Investigations Manager
		 * 1480436761938104380 = Help Forums Moderator
		 */
		Scope: Scope.Admin
	})
	.addUserOption(opt =>
		opt
			.setName("user")
			.setDescription("Enter a user you'd like to ban.")
			.setRequired(true)
	)
	.addStringOption(opt =>
		opt
			.setName("role")
			.setDescription("Enter the role you'd like to give.")
			.setRequired(true)
			.addChoices(
				{ name: "Media Banned", value: "media_ban" },
				{ name: "Help Banned", value: "help_ban" },
				{ name: "Voice Chat Banned", value: "vc_ban" },
				{ name: "Reactions Banned", value: "reaction_ban" },
				{ name: "VC Extras Banned", value: "vce_ban" },
				{ name: "Cool Channels Banned", value: "cool_ban" },
				{ name: "Market Banned", value: "market_ban" },
				{ name: "Emoji/Sticker Banned", value: "emoji_ban" },
				{ name: "Ticket Banned", value: "ticket_ban" },
				{ name: "Probation", value: "probation" }
			)
	)
	.addStringOption(opt =>
		opt
			.setName("length")
			.setDescription("Enter the length for the ban.")
			.setRequired(true)
	)
	.addStringOption(opt =>
		opt
			.setName("reason")
			.setDescription("Enter the reason for the ban.")
			.setRequired(true)
	)
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }

		const member = interaction.options.getMember("user")
		if (!member) {
			interaction.reply(errorEmbed("You must input a valid user."))
			return
		}
		const selectedRole = interaction.options.getString("role") || "media_ban"
		const length = await getLengthFromString(interaction.options.getString("length") || "")
		let lengthNum = (Math.floor(Date.now() / 1000) + length[0]!) || 0
		if (!length[1]) {
			length[1] = "Permanent"
			lengthNum = 0
		}
		const reason = interaction.options.getString("reason") || "No reason provided."

		if (interaction.member.roles.highest.position <= member.roles.highest.position || interaction.guild.members.me?.roles.highest.position! <= member.roles.highest.position || interaction.guild.ownerId === member.user.id || member.permissions.has([PermissionsBitField.Flags.Administrator]) || interaction.user.id === member.user.id) {
			interaction.reply(errorEmbed("You are unable to issue a role ban to this user."))
			return
		}

		let roleID: string
		let punishType: string

		switch (selectedRole) {
			case "media_ban":

				const mediaBan = interaction.guild.roles.cache.find((r: Role) => r.name.toLowerCase() === "media banned")
				if (!mediaBan) {
					interaction.reply(errorEmbed("Unable to fetch `Media Banned` role! Please contact a bot developer."))
					return
				}
				roleID = mediaBan.id
				punishType = "MEDIA BAN"

				break
			case "help_ban":

				const helpBan = interaction.guild.roles.cache.find((r: Role) => r.name.toLowerCase() === "help banned")
				if (!helpBan) {
					interaction.reply(errorEmbed("Unable to fetch `Help Banned` role! Please contact a bot developer."))
					return
				}
				roleID = helpBan.id
				punishType = "HELP BAN"

				break
			case "vc_ban":

				const vcBan = interaction.guild.roles.cache.find((r: Role) => r.name.toLowerCase() === "voice chat banned")
				if (!vcBan) {
					interaction.reply(errorEmbed("Unable to fetch `Voice Chat Banned` role! Please contact a bot developer."))
					return
				}
				roleID = vcBan.id
				punishType = "VOICE CHAT BAN"

				break
			case "reaction_ban":

				const reactionBan = interaction.guild.roles.cache.find((r: Role) => r.name.toLowerCase() === "reactions banned")
				if (!reactionBan) {
					interaction.reply(errorEmbed("Unable to fetch `Reactions Banned` role! Please contact a bot developer."))
					return
				}
				roleID = reactionBan.id
				punishType = "REACTIONS BAN"

				break
			case "vce_ban":

				const vceBan = interaction.guild.roles.cache.find((r: Role) => r.name.toLowerCase() === "vc extras banned")
				if (!vceBan) {
					interaction.reply(errorEmbed("Unable to fetch `VC Extras Banned` role! Please contact a bot developer."))
					return
				}
				roleID = vceBan.id
				punishType = "VC EXTRAS BAN"

				break
			case "cool_ban":

				const coolBan = interaction.guild.roles.cache.find((r: Role) => r.name.toLowerCase() === "cool channels banned")
				if (!coolBan) {
					interaction.reply(errorEmbed("Unable to fetch `Cool Channels Banned` role! Please contact a bot developer."))
					return
				}
				roleID = coolBan.id
				punishType = "COOL CHANNELS BAN"

				break
			case "market_ban":
				const marketBan = interaction.guild.roles.cache.find((r: Role) => r.name.toLowerCase() === "market banned")
				if (!marketBan) {
					interaction.reply(errorEmbed("Unable to fetch `Market Banned` role! Please contact a bot developer."))
					return
				}
				roleID = marketBan.id
				punishType = "MARKET BAN"

				break
			case "emoji_ban":

				const emojiBan = interaction.guild.roles.cache.find((r: Role) => r.name.toLowerCase() === "emoji/sticker banned")
				if (!emojiBan) {
					interaction.reply(errorEmbed("Unable to fetch `Emoji/Sticker Banned` role! Please contact a bot developer."))
					return
				}
				roleID = emojiBan.id
				punishType = "EMOJI/STICKER BAN"

				break
			case "ticket_ban":

				const ticketBan = interaction.guild.roles.cache.find((r: Role) => r.name.toLowerCase() === "ticket banned")
				if (!ticketBan) {
					interaction.reply(errorEmbed("Unable to fetch `Ticket Banned` role! Please contact a bot developer."))
					return
				}
				roleID = ticketBan.id
				punishType = "TICKET BAN"

				break
			case "probation":
				const probBan = interaction.guild.roles.cache.find((r: Role) => r.name.toLowerCase() === "probation")

				if (!probBan) {
					interaction.reply(errorEmbed("Unable to fetch `Probation` role! Please contact a bot developer."))
					return
				}
				roleID = probBan.id
				punishType = "PROBATION"
				break
			default:
				roleID = "NONE"
				punishType = "NONE"
				break
		}

		if (roleID === "NONE" || punishType === "NONE") {
			interaction.reply(errorEmbed("Unable to find what you were looking for, please contact a bot dev if this issue persists."))
			return
		}

		const findBan = await RoleBans.findOne({
			guildID: interaction.guild.id,
			userID: member.user.id,
			type: punishType
		})
		if (findBan) {
			interaction.reply(errorEmbed("This user already has an active ban under this type!"))
			return
		}

		await member.roles.add(roleID).catch(async (err: Error) => {
			interaction.reply(errorEmbed(`I am unable to assign a role to this user!\n\n\`${err.message}\``))
			return
		}).then(async () => {
			const caseNum = await incrimentCase(interaction.guild)

			const newCase = new Case({
				guildID: interaction.guild.id,
				userID: member.user.id,
				modID: interaction.user.id,
				caseNumber: caseNum,
				caseType: punishType,
				reason: reason,
				duration: length[1],
				durationUnix: lengthNum,
				active: true,
				dateIssued: Date.now()
			})
			newCase.save().catch((err: Error) => { handleError(err) })

			const newRoleBan = new RoleBans({
				guildID: interaction.guild.id,
				userID: member.user.id,
				roleID: roleID,
				type: punishType,
				caseNumber: caseNum,
				endDate: lengthNum
			})
			newRoleBan.save().catch((err: Error) => { handleError(err) })

			const warns = await Case.countDocuments({
				guildID: interaction.guild.id,
				userID: member.user.id,
				caseType: "WARN",
				active: true,
			})

			const banEmbed = new EmbedBuilder()
				.setDescription(`**Case:** #${caseNum} | **Mod:** ${interaction.user.username} | **Reason:** ${reason} | **Duration:** ${length[1]} | **Type:** ${punishType}`)
				.setColor("Green")
			interaction.reply({ content: `${config.arrowEmoji} **${member.user.username}** has been role banned. (**${warns}** warns)`, embeds: [banEmbed] })

			const youAreBanned = new EmbedBuilder()
				.setAuthor({ name: `You have been issued a ${punishType.toLowerCase()}`, iconURL: interaction.guild.iconURL() || undefined })
				.setDescription(`${config.bulletpointEmoji} **Reason:** ${reason}
			${config.bulletpointEmoji} **Duration:** ${length[1]}
			${config.bulletpointEmoji} **Case Number:** #${caseNum}
			
				If you believe this is a mistake, or unjustified, you may open a ticket to dispute.`)
				.setColor("Green")
				.setTimestamp()
			await member.send({ embeds: [youAreBanned] }).catch((err: Error) => { console.log("Uh oh!\n" + err.stack) })

			await sendModLogs({ guild: interaction.guild!, mod: interaction.member!, targetUser: member.user, action: punishType }, { title: "User Role Banned", actionInfo: `**Reason:** ${reason}\n> **Duration:** ${length[1]}\n> **Case ID:** ${caseNum}`, channel: interaction.channel || undefined })

		})

	})
