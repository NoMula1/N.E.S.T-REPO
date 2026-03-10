import { APIButtonComponent, ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, EmbedBuilder, ChatInputCommandInteraction, Role } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import Case from "../../../schemas/Case"
import lodash from "lodash"
import { errorEmbed } from "../../../utils/GenUtils"

export default new CommandExecutor()
	.setName("modlogs")
	.setDescription("View the moderation logs of a user.")
	.addUserOption(opt =>
		opt.setName("user")
			.setDescription("Select the user you would like to view.")
			.setRequired(false)
	)
	.addBooleanOption(opt =>
		opt.setName("showmod")
			.setRequired(false)
			.setDescription("Show the mod user")
	)
	.setBasePermission({
		Level: PermissionLevel.None
	})
	.setExecutor(async (interaction: ChatInputCommandInteraction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }

		let user = interaction.options.getUser("user")
		const showMod = interaction.options.getBoolean("showmod") ?? true
		if (!user ||
			(!interaction.member.roles.cache.has('1195598692569337918') &&
				interaction.member.guild.roles.cache.find((r: Role) => r.name.toLowerCase() === "trial community staff")?.position! > interaction.member.roles.highest.position)) {
			user = interaction.user
		}

		const cases = await Case.find({
			guildID: interaction.guild.id,
			userID: user.id
		}).sort({ dateIssued: "descending" })
		const arr: string[] = []

		for (const foundCase of cases) {
			if (!foundCase.caseNumber) return
			let pusher = `\n\n__Case #${foundCase.caseNumber}__`
			if (foundCase.modID && (showMod) && (interaction.member.roles.cache.has('1195598692569337918') || interaction.member.guild.roles.cache.find((r: Role) => r.name.toLowerCase() === "trial community staff")?.position! <= interaction.member.roles.highest.position)) {
				pusher = pusher + `\n**Mod:** <@${foundCase.modID}>`
			}
			if (foundCase.active !== null || foundCase.active !== undefined && foundCase.caseType !== "UNBAN" && foundCase.caseType !== "UNMUTE" && foundCase.caseType !== "KICK") {
				pusher = pusher + `\n**Expired:** ${foundCase.active ? "No" : "Yes"}`
			}
			if (foundCase.caseType) {
				pusher = pusher + `\n**Case Type:** \`${foundCase.caseType}\``
			}
			if (foundCase.reason) {
				pusher = pusher + `\n**Reason:** ${(foundCase.reason.length <= 150) ? foundCase.reason : `Too long; please run \`/case case_number:${foundCase.caseNumber}\``}`
			}
			if (foundCase.duration && foundCase.durationUnix! > 0) {
				pusher = pusher + `\n**Duration:** ${foundCase.duration}`
			}
			if (foundCase.dateIssued) {
				pusher = pusher + `\n**Date Issued:** <t:${Math.floor(foundCase.dateIssued / 1000)}:d> (<t:${Math.floor(foundCase.dateIssued / 1000)}:R>)`
			}
			arr.push(`${pusher}`)
		}

		const histArr = lodash.chunk(arr, 5)

		if (histArr.length == 0) {
			interaction.reply(errorEmbed("This user does not have any past punishments."))
			return
		}

		let row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder()
					.setCustomId(`left`)
					.setStyle(ButtonStyle.Success)
					.setDisabled(true)
					.setEmoji("◀"),
				new ButtonBuilder()
					.setCustomId(`end_interaction`)
					.setStyle(ButtonStyle.Danger)
					.setEmoji("✖"),
				new ButtonBuilder()
					.setCustomId(`right`)
					.setStyle(ButtonStyle.Success)
					.setDisabled(true)
					.setEmoji("▶")
			)
		let numbers = 0

		const historyEmbed = new EmbedBuilder()
			.setAuthor({ name: `${user.username}'s History (${numbers + 1}/${histArr.length})`, iconURL: user.displayAvatarURL() || undefined })
			.setColor("Green")
			.setDescription(`${histArr[numbers]}`)
			.setThumbnail(user?.displayAvatarURL() || null)
			.setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() || undefined })
			.setTimestamp()
		const histReply = await interaction.reply({ embeds: [historyEmbed], fetchReply: true, components: [row] })
		if (histArr.length > 1) {
			row = new ActionRowBuilder<ButtonBuilder>()
				.addComponents(
					ButtonBuilder.from(histReply.components[0].components[0] as APIButtonComponent).setDisabled(true),
					ButtonBuilder.from(histReply.components[0].components[1] as APIButtonComponent).setDisabled(false),
					ButtonBuilder.from(histReply.components[0].components[2] as APIButtonComponent).setDisabled(false)
				)
			histReply.edit({ components: [row] })
		}

		const collector = histReply.createMessageComponentCollector({ time: 50000 })

		collector.on("collect", async (bInteraction: ButtonInteraction) => {
			if (bInteraction.user.id !== interaction.user.id) {
				bInteraction.reply({ content: "This is not your interaction!", ephemeral: true })
				return
			}

			await bInteraction.deferUpdate()
			switch (bInteraction.customId) {
				case "left":
					if (numbers === 0)
						return
					numbers = numbers - 1
					if (numbers === 0) {
						row = new ActionRowBuilder<ButtonBuilder>()
							.addComponents(
								ButtonBuilder.from(histReply.components[0].components[0] as APIButtonComponent).setDisabled(true),
								ButtonBuilder.from(histReply.components[0].components[1] as APIButtonComponent),
								ButtonBuilder.from(histReply.components[0].components[2] as APIButtonComponent).setDisabled(false),
							)
					}

					const histLeftEdit = new EmbedBuilder()
						.setAuthor({ name: `${user!.username}'s History (${numbers + 1}/${histArr.length})`, iconURL: user!.displayAvatarURL() || undefined })
						.setColor("Green")
						.setDescription(`${histArr[numbers]}`)
						.setThumbnail(user?.displayAvatarURL() || null)
						.setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() || undefined })
						.setTimestamp()
					histReply.edit({ embeds: [histLeftEdit], components: [row] })

					break
				case "end_interaction":

					row = new ActionRowBuilder<ButtonBuilder>()
						.addComponents(
							ButtonBuilder.from(histReply.components[0].components[0] as APIButtonComponent).setDisabled(true),
							ButtonBuilder.from(histReply.components[0].components[1] as APIButtonComponent).setDisabled(true),
							ButtonBuilder.from(histReply.components[0].components[2] as APIButtonComponent).setDisabled(true)
						)
					const histEndInteraction = new EmbedBuilder()
						.setAuthor({ name: `${user!.username}'s History (${numbers + 1}/${histArr.length})`, iconURL: user!.displayAvatarURL() || undefined })
						.setColor("Green")
						.setDescription(`${histArr[numbers]}`)
						.setThumbnail(user?.displayAvatarURL() || null)
						.setFooter({ text: `Requested by ${interaction.user.username} - Interaction Ended (User)`, iconURL: interaction.user.displayAvatarURL() || undefined })
						.setTimestamp()
					histReply.edit({ embeds: [histEndInteraction], components: [row] })

					break
				case "right":
					numbers = numbers + 1
					if (histArr[numbers] == null) { numbers = numbers - 1; return }
					if (histArr[numbers + 1] == null) {
						row = new ActionRowBuilder<ButtonBuilder>()
							.addComponents(
								ButtonBuilder.from(histReply.components[0].components[0] as APIButtonComponent).setDisabled(false),
								ButtonBuilder.from(histReply.components[0].components[1] as APIButtonComponent),
								ButtonBuilder.from(histReply.components[0].components[2] as APIButtonComponent).setDisabled(true),
							)
					}


					const histRightEdit = new EmbedBuilder()
						.setAuthor({ name: `${user!.username}'s History (${numbers + 1}/${histArr.length})`, iconURL: user!.displayAvatarURL() || undefined })
						.setColor("Green")
						.setDescription(`${histArr[numbers]}`)
						.setThumbnail(user?.displayAvatarURL() || null)
						.setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() || undefined })
						.setTimestamp()
					histReply.edit({ embeds: [histRightEdit], components: [row] })

					break
			}
		})

		collector.on("end", async (bInteraction: ButtonInteraction) => {
			row = new ActionRowBuilder<ButtonBuilder>()
				.addComponents(
					ButtonBuilder.from(histReply.components[0].components[0] as APIButtonComponent).setDisabled(true),
					ButtonBuilder.from(histReply.components[0].components[1] as APIButtonComponent).setDisabled(true),
					ButtonBuilder.from(histReply.components[0].components[2] as APIButtonComponent).setDisabled(true)
				)
			const histEndInteraction = new EmbedBuilder()
				.setAuthor({ name: `${user!.username}'s History (${numbers + 1}/${histArr.length})`, iconURL: user!.displayAvatarURL() || undefined })
				.setColor("Green")
				.setDescription(`${histArr[numbers]}`)
				.setThumbnail(user?.displayAvatarURL() || null)
				.setFooter({ text: `Requested by ${interaction.user.username} - Interaction Ended (Auto)`, iconURL: interaction.user.displayAvatarURL() || undefined })
				.setTimestamp()
			histReply.edit({ embeds: [histEndInteraction], components: [row] })

		})

	})
