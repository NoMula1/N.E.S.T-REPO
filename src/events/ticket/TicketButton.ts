import { Log } from "../../utils/logging"
import { APIButtonComponent, ActionRowBuilder, ButtonBuilder, ButtonStyle, CategoryChannel, ChannelType, EmbedBuilder, Events, Interaction, InteractionEditReplyOptions, Message, ModalBuilder, PermissionsBitField, Role, TextChannel, TextInputBuilder, TextInputStyle, ThreadAutoArchiveDuration } from "discord.js"
import { errorEmbed, handleError, incrimentTicket } from "../../utils/GenUtils"
import Tickets from "../../schemas/Tickets"
import { mkdirSync, writeFileSync, readdirSync, readFileSync, rmSync } from "fs"
import path from "path"
import { config } from "../../utils/config"
import { escapeRegExp } from "lodash"
import TicketStatus from "../../schemas/TicketStatus"
import { resolveTicketStatusEmbed, ticketStatus, updateTicketStatus } from './TicketStatusUpdate'
import FastFlag from "../../schemas/FastFlag"
import { EventOptions } from "../../utils/RegisterEvents"

const SkipTickets = [
	1488,
	69,
	420,
	69420,
]


export default {
	name: Events.InteractionCreate,
	once: false,
	async execute(_: EventOptions, interaction: Interaction) {
		if (!interaction.inCachedGuild()) return
		if (interaction.isButton()) {
			const buttonID = interaction.customId
			switch (buttonID) {
				case "open_internal_affair": {
					const internalAffairEmbed = new EmbedBuilder()
						.setTitle('New Internal Affair Report')
						.setColor("Red")
						.setDescription(`This feature will open a ticket, used to report staff misconduct or staff grievances. This ticket will only be able to be viewed by Internal Reviewers.`
							+ `\n\n**Click "Open Ticket" below to acknowledge this feature's intended usage**, and to open an Internal Affair Ticket.`)
					const internalAffairButtons = new ActionRowBuilder<ButtonBuilder>()
						.addComponents(
							new ButtonBuilder()
								.setLabel('Nevermind')
								.setCustomId('internal-affair-nevermind')
								.setStyle(ButtonStyle.Danger),
							new ButtonBuilder()
								.setLabel('Open Ticket')
								.setCustomId('internal-affair-open-ticket')
								.setStyle(ButtonStyle.Primary)
						)
					await interaction.reply({
						ephemeral: true,
						embeds: [
							internalAffairEmbed
						],
						components: [
							internalAffairButtons
						]
					})
					break
				}
				case "internal-affair-nevermind": {
					await interaction.update({
						embeds: [],
						components: [],
						content: `Ok, I've cancelled your request.`
					})

					break
				}
				case "internal-affair-open-ticket": {
					await interaction.update({
						embeds: [],
						components: [],
						content: `Opening a ticket...`
					})

					const ticketsDisabled = await FastFlag.findOne({
						refName: 'DisableTicketOpening',
						enabled: true
					})
					if (ticketsDisabled) {
						await interaction.editReply({
							content: 'Tickets are currently disabled. Please try again later.'
						})
						return
					}

					if (interaction.member.roles.cache.find((r: Role) => r.name.toLowerCase() === "ticket banned")) {
						await interaction.editReply(errorEmbed("You are banned from opening tickets.") as InteractionEditReplyOptions)
						return
					}

					const findTicket = await Tickets.findOne({
						guildID: interaction.guild.id,
						creatorID: interaction.user.id,
						status: true,
					})
					if (findTicket) {
						const ticketChannel: any = await interaction.guild.channels.fetch(findTicket.channelID!).catch((err) => { })
						console.log(ticketChannel)
						if (ticketChannel) {
							await interaction.editReply(errorEmbed("You already have a ticket open.") as InteractionEditReplyOptions)
							return
						} else {
							await findTicket.deleteOne()
						}
					}
					const category = interaction.guild.channels.cache.find(c => c.name.toLowerCase() == "internal affairs" && c.type === ChannelType.GuildCategory) as CategoryChannel
					if (!category) {
						await interaction.editReply(errorEmbed("No affair category found. Please contact an administrator!") as InteractionEditReplyOptions)
						return
					}
					const internalReviewer = interaction.guild.roles.cache.find(r => r.name === "Internal Reviewer")


					let ticketNum = await incrimentTicket(interaction.guild)
					if (SkipTickets.find(t => t === ticketNum)) {
						Log.debug(`Ticket #${ticketNum} has been skipped.`)
						ticketNum = await incrimentTicket(interaction.guild)
					}

					const newChannel = await interaction.guild.channels.create({
						name: `internal-affair-${ticketNum}`,
						type: ChannelType.GuildText,
						permissionOverwrites: [
							{
								id: interaction.guild.id,
								deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
							},
							{
								id: interaction.user.id,
								allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles]
							},
							{
								id: internalReviewer!.id,
								allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
							}
						],
						reason: `Ticket opened by ${interaction.user.username}.`,
						parent: category,
					}).catch(async (err: Error) => {
						await interaction.editReply(errorEmbed("Unable to create ticket channel! Please try again.") as InteractionEditReplyOptions)
						Log.error(err)
						return
					})
					if (!newChannel) {
						await interaction.editReply(errorEmbed("Unable to create ticket channel! Please try again.") as InteractionEditReplyOptions)
						return
					}

					// const transcriptPath1 = path.join(__dirname, "../..", "transcripts");
					// if (existsSync(transcriptPath1)) {
					// 	await interaction.editReply(errorEmbed(`I had an error with the transcripts! Please contact an administrator with a screenshot of this message. \`T-${ticketNum}\``));
					// 	return;
					// }
					const transcriptPath = path.join(__dirname, "../..", "transcripts", `${newChannel.id}`)


					try {
						mkdirSync(transcriptPath)
					} catch (err) {
						interaction.editReply(errorEmbed("Unable to create ticket transcript!") as InteractionEditReplyOptions)
						Log.error(err)
						newChannel.delete().catch((err) => {
							Log.error(err)
						})
						return
					}

					const meta = {
						creator: interaction.user.id,
						ticketID: newChannel.id,
						date: new Date()
					}
					try {
						writeFileSync(`${transcriptPath}/ticket_meta.json`, JSON.stringify(meta))
						writeFileSync(`${transcriptPath}/ticket_transcript.md`, "")
						writeFileSync(`${transcriptPath}/ticket_transcript.txt`, "")
						mkdirSync(path.join(__dirname, "../..", "transcripts", `${newChannel.id}`, "media"))
					} catch (err) {
						interaction.editReply(errorEmbed("Unable to create ticket transcript!") as InteractionEditReplyOptions)
						Log.error(err)
						rmSync(path.join(__dirname, "../..", "transcripts", `${newChannel.id}`), { recursive: true, force: true })
						newChannel.delete().catch(() => { })
						return
					}

					const ticketRow = new ActionRowBuilder<ButtonBuilder>()
						.addComponents(
							new ButtonBuilder()
								.setCustomId("close_ticket")
								.setStyle(ButtonStyle.Danger)
								.setLabel("Close Ticket")
								.setEmoji("✖")
						)

					const ticketEmbed = new EmbedBuilder()
						.setAuthor({ name: `${interaction.user.username}'s Internal Affair Report`, iconURL: interaction.user.displayAvatarURL() || undefined })
						.setColor(0xf1c40f)
						.setDescription(`Thank you for taking the time to open an Internal Affair Report, where you can report staff misconduct or any other staff related grievances. Please describe the following in detail so we can work on your case as fast as possible:\n\n- Which staff are you reporting?\n- What are you reporting them for?\n- What proof do you have regarding this report?\n- What would you hope is done about this matter?\n- Any other information?\n\nAll content in this report is as confidential as possible between you, internal reviewers, and server managers.`)
						.setTimestamp()
						.setFooter({ text: "Ticket transcripts are saved permanently and are viewable by non-internal reviewers." })
					newChannel.send({ content: `<@${interaction.user.id}> <@&1203544976030437397>`, embeds: [ticketEmbed], components: [ticketRow as any] })

					const newTicket = new Tickets({
						guildID: interaction.guild.id,
						creatorID: interaction.user.id,
						users: [],
						channelID: newChannel.id,
						claimedID: "None",
						closeReason: "None",
						status: true,
						autoClose: 0,
					})
					newTicket.save().catch(async (err: Error) => {
						await interaction.editReply(errorEmbed("Failed to create ticket file!") as InteractionEditReplyOptions)
						Log.error(err)
						newChannel.delete().catch((error: Error) => { Log.error("Failed to delete ticket channel!\n\n" + error.stack) })
						return
					})
					await interaction.editReply({ content: `Your internal affair report has been created. <#${newChannel.id}>` })

					break
				}
				case "open_ticket":
					{
						await interaction.deferReply({ ephemeral: true })

						const ticketsDisabled = await FastFlag.findOne({
							refName: 'DisableTicketOpening',
							enabled: true
						})
						if (ticketsDisabled) {
							await interaction.editReply({
								content: 'Tickets are currently disabled. Please try again later.'
							})
							return
						}

						if (interaction.member.roles.cache.find((r: Role) => r.name.toLowerCase() === "ticket banned")) {
							await interaction.editReply(errorEmbed("You are banned from opening tickets.") as InteractionEditReplyOptions)
							return
						}

						const findTicket = await Tickets.findOne({
							guildID: interaction.guild.id,
							creatorID: interaction.user.id,
							status: true,
						})
						if (findTicket) {
							const ticketChannel = interaction.guild.channels.cache.get(findTicket.channelID!)
							if (ticketChannel) {
								await interaction.editReply(errorEmbed("You already have a ticket open.") as InteractionEditReplyOptions)
								return
							} else {
								await findTicket.deleteOne()
							}
						}

						const category = interaction.guild.channels.cache.find(c => c.name.toLowerCase() == "tickets" && c.type === ChannelType.GuildCategory) as CategoryChannel
						if (!category) {
							await interaction.editReply(errorEmbed("No ticket category found. Please contact an administrator!") as InteractionEditReplyOptions)
							return
						}
						const juniorMod = interaction.guild.roles.cache.find(r => r.name === "Trial Community Moderator")
						const srMarketMod = interaction.guild.roles.cache.find(r => r.name === "Senior Marketplace Moderator")

						let ticketNum = await incrimentTicket(interaction.guild)
						if (SkipTickets.find(t => { t === ticketNum })) {
							Log.debug(`Ticket #${ticketNum} has been skipped.`)
							ticketNum = await incrimentTicket(interaction.guild)
						}

						const newChannel = await interaction.guild.channels.create({
							name: `ticket-${ticketNum}`,
							type: ChannelType.GuildText,
							permissionOverwrites: [
								{
									id: interaction.guild.id,
									deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
								},
								{
									id: interaction.user.id,
									allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles]
								},
								{
									id: "1203545488008155136",
									allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
								},
							],
							reason: `Ticket opened by ${interaction.user.username}.`,
							parent: category,
						}).catch(async (err: Error) => {
							await interaction.editReply(errorEmbed("Unable to create ticket channel! Please try again.") as InteractionEditReplyOptions)
							Log.error(err)
							return
						})
						if (!newChannel) {
							await interaction.editReply(errorEmbed("Unable to create ticket channel! Please try again.") as InteractionEditReplyOptions)
							return
						}

						// const transcriptPath1 = path.join(__dirname, "../..", "transcripts");
						// if (existsSync(transcriptPath1)) {
						// 	await interaction.editReply(errorEmbed(`I had an error with the transcripts! Please contact an administrator with a screenshot of this message. \`T-${ticketNum}\``));
						// 	return;
						// }
						const transcriptPath = path.join(__dirname, "../..", "transcripts", `${newChannel.id}`)


						try {
							mkdirSync(transcriptPath)
						} catch (err) {
							interaction.editReply(errorEmbed("Unable to create ticket transcript!") as InteractionEditReplyOptions)
							Log.error(err)
							newChannel.delete().catch(() => { })
							return
						}

						const meta = {
							creator: interaction.user.id,
							ticketID: newChannel.id,
							date: new Date()
						}
						try {
							writeFileSync(`${transcriptPath}/ticket_meta.json`, JSON.stringify(meta))
							writeFileSync(`${transcriptPath}/ticket_transcript.md`, "")
							writeFileSync(`${transcriptPath}/ticket_transcript.txt`, "")
							mkdirSync(path.join(__dirname, "../..", "transcripts", `${newChannel.id}`, "media"))
						} catch (err) {
							interaction.editReply(errorEmbed("Unable to create ticket transcript!") as InteractionEditReplyOptions)
							Log.error(err)
							rmSync(path.join(__dirname, "../..", "transcripts", `${newChannel.id}`), { recursive: true, force: true })
							newChannel.delete().catch(() => { })
							return
						}

						const ticketRow = new ActionRowBuilder<ButtonBuilder>()
							.addComponents(
								new ButtonBuilder()
									.setCustomId("close_ticket")
									.setStyle(ButtonStyle.Danger)
									.setLabel("Close Ticket")
									.setEmoji("✖")
							)

						const ticketEmbed = new EmbedBuilder()
							.setAuthor({ name: `${interaction.user.username}'s Ticket`, iconURL: interaction.user.displayAvatarURL() || undefined })
							.setColor("Green")
							.setDescription(`Please describe why you opened this ticket, a staff member will be with you shortly.
								
								If you opened this ticket by mistake, leave a short response and close the ticket.`)
							.setTimestamp()
							.setFooter({ text: "Ticket transcripts are saved permanently." })
					newChannel.send({ content: `<@${interaction.user.id}> <@&1050243383999864852> https://nohello.net`, embeds: [ticketEmbed], components: [ticketRow as any] })

						const newTicket = new Tickets({
							guildID: interaction.guild.id,
							creatorID: interaction.user.id,
							users: [],
							channelID: newChannel.id,
							claimedID: "None",
							closeReason: "None",
							status: true,
							autoClose: 0,
						})
						newTicket.save().catch(async (err: Error) => {
							await interaction.editReply(errorEmbed("Failed to create ticket file!") as InteractionEditReplyOptions)
							newChannel.delete().catch((error: Error) => { Log.error("Failed to delete ticket channel!\n\n" + error.stack) })
							return
						})
						await interaction.editReply({ content: `Your ticket has been created. <#${newChannel.id}>` })
						break
					}
				case "close_ticket":
					const findingTicket = await Tickets.findOne({
						guildID: interaction.guild.id,
						channelID: interaction.channel?.id
					})
					if (!findingTicket) return
					if (interaction.user.id !== findingTicket.creatorID) {
						if (interaction.member.roles.cache.find((r: Role) => r.name.toLowerCase() === "assistant moderator")?.position! > interaction.member.roles.highest.position || interaction.member.roles.cache.find((r: Role) => r.name.toLowerCase() === "senior marketplace moderator")?.position! > interaction.member.roles.highest.position) {
							interaction.editReply(errorEmbed("You must be the ticket creator to close the ticket!") as InteractionEditReplyOptions)
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
					await interaction.showModal(postForm as any)
					break
				case "log_transcript":
					await interaction.deferReply({ ephemeral: true })

					if (interaction.member.roles.cache.find((r: Role) => r.name.toLowerCase() === "assistant moderator")?.position! > interaction.member.roles.highest.position || interaction.member.roles.cache.find((r: Role) => r.name.toLowerCase() === "senior marketplace moderator")?.position! > interaction.member.roles.highest.position) {
						interaction.editReply(errorEmbed("You must be an Assistant Moderator to use this!") as InteractionEditReplyOptions)
						return
					}
					const foundTicket = await Tickets.findOne({
						guildID: interaction.guild.id,
						channelID: interaction.channel?.id
					})
					if (!foundTicket) return

					interaction.channel?.send({ content: `Transcript and media being send to the transcripts channel now.` })
					transcriptString(interaction.channel?.name!, interaction.channel?.id!, interaction, interaction.user.id)
					const ticketRow2 = new ActionRowBuilder<ButtonBuilder>()
						.addComponents(
							new ButtonBuilder()
								.setCustomId("log_transcript")
								.setStyle(ButtonStyle.Secondary)
								.setLabel("Log Transcript")
								.setDisabled(true)
								.setEmoji("📰"),
							new ButtonBuilder()
								.setCustomId("delete_ticket")
								.setStyle(ButtonStyle.Danger)
								.setLabel("Delete Ticket")
								.setEmoji("🗑"),
						)
					await interaction.message.edit({ components: [ticketRow2 as any] })
					interaction.editReply({ content: "Transcript logged." })
					break
				case "delete_ticket":
					await interaction.deferReply({})

					if (interaction.member.roles.cache.find((r: Role) => r.name.toLowerCase() === "assistant moderator")?.position! > interaction.member.roles.highest.position || interaction.member.roles.cache.find((r: Role) => r.name.toLowerCase() === "senior marketplace moderator")?.position! > interaction.member.roles.highest.position) {
						interaction.editReply(errorEmbed("You must be an Assistant Moderator to use this!") as InteractionEditReplyOptions)
						return
					}
					await Tickets.findOneAndDelete({
						guildID: interaction.guild.id,
						channelID: interaction.channel?.id
					})

					const ticketRow3 = new ActionRowBuilder<ButtonBuilder>()
						.addComponents(
							new ButtonBuilder()
								.setCustomId("log_transcript")
								.setStyle(ButtonStyle.Secondary)
								.setLabel("Log Transcript")
								.setDisabled(true)
								.setEmoji("📰"),
							new ButtonBuilder()
								.setCustomId("delete_ticket")
								.setStyle(ButtonStyle.Danger)
								.setLabel("Delete Ticket")
								.setDisabled(true)
								.setEmoji("🗑"),
						)
					await interaction.message.edit({ components: [ticketRow3 as any] })

					await interaction.editReply({ content: "Ticket file deleted, deleting channel soon." })
					setTimeout(async () => {
						rmSync(path.join(__dirname, "../..", "transcripts", `${interaction.channel?.id}`), { recursive: true, force: true })
						await interaction.channel?.delete("Ticket closed")
					}, 10000)
					break
				case "req_close":
					await interaction.deferReply({ ephemeral: true })
					const reqTicket = await Tickets.findOne({
						guildID: interaction.guild.id,
						channelID: interaction.channel?.id,
						status: true
					})
					if (!reqTicket) {
						interaction.editReply(errorEmbed("Ticket already closed.") as InteractionEditReplyOptions)
						return
					}
					if (reqTicket.creatorID !== interaction.user.id) {
						interaction.editReply({ content: "This is not your button!" })
						return
					}
					await reqTicket.updateOne({
						status: false
					})

					const row = new ActionRowBuilder<ButtonBuilder>()
						.addComponents(
							ButtonBuilder.from((interaction.message.components[0] as any).components[0] as APIButtonComponent).setDisabled(true),
							ButtonBuilder.from((interaction.message.components[0] as any).components[1] as APIButtonComponent).setDisabled(true),
						)
					interaction.message.edit({ components: [row] })

					const ticketRowReq = new ActionRowBuilder<ButtonBuilder>()
						.addComponents(
							new ButtonBuilder()
								.setCustomId("close_ticket")
								.setStyle(ButtonStyle.Danger)
								.setLabel("Close Ticket")
								.setDisabled(true)
								.setEmoji("✖"),
							new ButtonBuilder()
								.setCustomId("log_transcript")
								.setStyle(ButtonStyle.Secondary)
								.setLabel("Log Transcript")
								.setEmoji("📰"),
						)

					const ticketClosed = new EmbedBuilder()
						.setAuthor({ name: `Ticket Closed - ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() || undefined })
						.setDescription(`Ticket has been closed. The ticket creator, and any added users have been removed and can no longer view the ticket.
						**Reason:** ${reqTicket.closeReason}
						
						Click \`Log Transcript\` to log the transcript.`)
						.setColor("Green")
						.setTimestamp()
					interaction.channel?.send({ embeds: [ticketClosed], components: [ticketRowReq] })

					const ticketClosedDM = new EmbedBuilder()
						.setAuthor({ name: "Ticket Closed", iconURL: interaction.guild.iconURL() || undefined })
						.setDescription(`Ticket \`#${interaction.channel?.name.split('-')[1]}\` has been closed!
						
						${config.bulletpointEmoji} **Reason:** ${reqTicket.closeReason}`)
						.setColor("Green")
						.setTimestamp()


					await interaction.channel?.edit({
						name: `closed-${interaction.channel.name.split('-')[1]}`
					}).catch(async (err: Error) => {
						handleError(err)
						await interaction.editReply(errorEmbed(`An error occurred!\n\`${err.name}\``) as InteractionEditReplyOptions)
						return
					})
					await (interaction.channel as TextChannel).permissionOverwrites.edit(reqTicket.creatorID!, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false })
					const creator = interaction.client.users.cache.get(reqTicket.creatorID!)
					if (creator) {
						creator.send({ embeds: [ticketClosedDM] }).catch(() => { })
					}
					for (const user of reqTicket.users) {
						await (interaction.channel as TextChannel).permissionOverwrites.edit(user, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false })
						const foundUser = interaction.client.users.cache.get(user)
						if (!foundUser) return
						await foundUser.send({ embeds: [ticketClosedDM] }).catch(() => { })
					}
					interaction.editReply({ content: "Ticket closed." })
					break
				case "req_keep_open":

					await interaction.deferReply({ ephemeral: true })
					const reqTicket2 = await Tickets.findOne({
						guildID: interaction.guild.id,
						channelID: interaction.channel?.id,
						status: true
					})
					if (!reqTicket2) {
						interaction.editReply(errorEmbed("Ticket already closed.") as InteractionEditReplyOptions)
						return
					}
					if (reqTicket2.creatorID !== interaction.user.id) {
						interaction.editReply({ content: "This is not your button!" })
						return
					}
					await reqTicket2.updateOne({
						closeReason: "None"
					})

					const reqRow = new ActionRowBuilder<ButtonBuilder>()
						.addComponents(
						ButtonBuilder.from((interaction.message.components[0] as any).components[0] as APIButtonComponent).setDisabled(true),
						ButtonBuilder.from((interaction.message.components[0] as any).components[1] as APIButtonComponent).setDisabled(true),
						)
					interaction.message.edit({ components: [reqRow] })
					interaction.channel?.send({ content: "Close request denied!" }).catch(() => { })
					interaction.editReply({ content: "Cancelled close request." })

					break
			}
			// Update ticket status message
			const ticketStatusMessage = await TicketStatus.findOne({
				guildId: interaction.guildId
			})
			const status = await updateTicketStatus()
			if (ticketStatusMessage?.ticketStatus !== status) {
				if (ticketStatusMessage) {
					const channel: TextChannel | null = (await interaction.guild.channels.fetch(ticketStatusMessage.channelId!) as unknown as TextChannel)
					let message: Message<true> | null = null

					try {
						message = await channel?.messages.fetch(ticketStatusMessage.messageId!)
					} catch (err) {
						// TODO: Use the logger. console.log is deprecated
						console.log(err)
					}

					await message?.delete()
					const tEmbed = await resolveTicketStatusEmbed(status)
					const newEmbed = await channel.send({
						embeds: [
							tEmbed
						]
					})

					await ticketStatusMessage.deleteOne()
					await TicketStatus.create({
						guildId: interaction.guildId,
						channelId: newEmbed.channelId,
						messageId: newEmbed.id,
						ticketStatus: status
					})
				}
			}
		} else if (interaction.isModalSubmit()) {
			const customID = interaction.customId

			switch (customID) {
				case "modal_close_reason":
					await interaction.deferReply({ ephemeral: true })

					const foundTicket = await Tickets.findOne({
						guildID: interaction.guild.id,
						channelID: interaction.channel?.id,
						status: true
					})
					if (!foundTicket) {
						interaction.editReply(errorEmbed("Ticket already closed.") as InteractionEditReplyOptions)
						return
					}
					await foundTicket.updateOne({
						closeReason: interaction.fields.getTextInputValue('close_reason') || "No reason found!",
						status: false
					})

					let ticketRow = new ActionRowBuilder<ButtonBuilder>()
						.addComponents(
							new ButtonBuilder()
								.setCustomId("close_ticket")
								.setStyle(ButtonStyle.Danger)
								.setLabel("Close Ticket")
								.setDisabled(true)
								.setEmoji("✖"),
						)
					await interaction.message?.edit({ components: [ticketRow] })

					ticketRow = new ActionRowBuilder<ButtonBuilder>()
						.addComponents(
							new ButtonBuilder()
								.setCustomId("log_transcript")
								.setStyle(ButtonStyle.Secondary)
								.setLabel("Log Transcript")
								.setEmoji("📰"),
						)

					const ticketClosed = new EmbedBuilder()
						.setAuthor({ name: `Ticket Closed - ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() || undefined })
						.setDescription(`Ticket has been closed. The ticket creator, and any added users have been removed and can no longer view the ticket.
						**Reason:** ${interaction.fields.getTextInputValue('close_reason') || "No reason found!"}
						
						Click \`Log Transcript\` to log the transcript.`)
						.setColor("Green")
						.setTimestamp()
					interaction.channel?.send({ embeds: [ticketClosed], components: [ticketRow] })

					const ticketClosedDM = new EmbedBuilder()
						.setAuthor({ name: "Ticket Closed", iconURL: interaction.guild.iconURL() || undefined })
						.setDescription(`Ticket \`#${interaction.channel?.name.split('-')[1]}\` has been closed!
						
						${config.bulletpointEmoji} **Reason:** ${interaction.fields.getTextInputValue('close_reason') || "No reason found!"}`)
						.setColor("Green")
						.setTimestamp()


					await interaction.channel?.edit({
						name: `closed-${interaction.channel.name.split('-')[1]}`
					}).catch(async (err: Error) => {
						handleError(err)
						await interaction.editReply(errorEmbed(`An error occurred!\n\`${err.name}\``) as InteractionEditReplyOptions)
						return
					})
					await (interaction.channel as TextChannel).permissionOverwrites.edit(foundTicket.creatorID!, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false })
					const creator = interaction.client.users.cache.get(foundTicket.creatorID!)
					if (creator) {
						creator.send({ embeds: [ticketClosedDM] }).catch(() => { })
					}
					for (const user of foundTicket.users) {
						await (interaction.channel as TextChannel).permissionOverwrites.edit(user, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false })
						const foundUser = interaction.client.users.cache.get(user)
						if (!foundUser) return
						await foundUser.send({ embeds: [ticketClosedDM] }).catch(() => { })
					}
					interaction.editReply({ content: "Ticket closed." })

					break
			}
		}
	}
}

async function getTicketTranscriptByID(id: string) {
	try {
		const media = readdirSync(path.join(__dirname, "../..", "transcripts", `${id}`, "media"))
		const md = readFileSync(path.join(__dirname, "../..", "transcripts", `${id}`, "ticket_transcript.md"))
		const txt = readFileSync(path.join(__dirname, "../..", "transcripts", `${id}`, "ticket_transcript.txt"))
		return { media, md, txt }
	} catch (err) {
		Log.error(err)
		handleError(err as any)
	}
	return null
}

async function transcriptString(ticketname: string, ticket_id: string, interaction: Interaction, closerID: string) {
	const scriptsChannel = interaction.guild!.channels.cache.find(c => c.name.toLowerCase() == "transcripts")!
	if (!scriptsChannel) return

	const foundTicket = await Tickets.findOne({
		guildID: interaction.guild?.id,
		channelID: ticket_id,
	})
	if (!foundTicket) return
	const user = await interaction.client.users.fetch(foundTicket.creatorID!)

	const results = await getTicketTranscriptByID(ticket_id)
	const transcriptEmbed = new EmbedBuilder()
		.setAuthor({ name: `Ticket #${(interaction.channel as TextChannel)?.name.split('-')[1]} Transcript`, iconURL: interaction.guild?.iconURL() || undefined })
		.setThumbnail(user.displayAvatarURL() || null)
		.setDescription(`${config.bulletpointEmoji} **Creator:** <@${foundTicket.creatorID}>
		${config.bulletpointEmoji} **Closer:** <@${closerID}>
		${config.bulletpointEmoji} **Reason:** ${foundTicket.closeReason}`)
		.setColor("Green")
		.setTimestamp()
	if (!results) {
		// Backup: no transcript session was found
		const fetched = await interaction.channel?.messages.fetch({ limit: 100 })
		if (!fetched) return
		let s = ""
		for (const msg of Array.from(fetched.values())) {
			s += `From ${msg.author.tag} (${msg.author.id})\n    ` + (msg.content ?? "") + "\n"
		}
		const buffer = Buffer.from(escapeRegExp(s), 'utf-8')
		const msg = await (scriptsChannel as TextChannel).send({
			embeds: [transcriptEmbed],
		})
		const thread = await msg.startThread({
			name: `Ticket #${(interaction.channel as TextChannel)?.name.split('-')[1]}`,
			autoArchiveDuration: 60,
			reason: `Transcript`,
		})
		thread.send({
			files: [
				{ attachment: buffer, name: ticketname + ".txt" }
			]
		})
		return
	}
	const msg = await (scriptsChannel as TextChannel).send({
		embeds: [transcriptEmbed],
		files: [
			{ attachment: results.md, name: ticketname + '.md' },
			{ attachment: results.txt, name: ticketname + '.txt' }
		]
	})
	const thread = await msg.startThread({
		name: `Ticket-${(interaction.channel as TextChannel)?.name.split('-')[1]} Media`,
		autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
		reason: 'Ticket Media'
	})
	for (const mediaFile of results.media) {
		await thread.send({
			content: mediaFile,
			files: [
				path.join(__dirname, "../..", "transcripts", `${ticket_id}`, "media", `${mediaFile}`)
			]
		})
	}
}