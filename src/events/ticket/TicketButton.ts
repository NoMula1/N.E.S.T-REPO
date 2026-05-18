import { Log } from "../../utils/logging"
import {
	APIButtonComponent,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	CategoryChannel,
	ChannelType,
	EmbedBuilder,
	Events,
	Interaction,
	InteractionEditReplyOptions,
	Message,
	MessageFlags,
	ModalBuilder,
	OverwriteType,
	PermissionsBitField,
	Role,
	TextChannel,
	TextInputBuilder,
	TextInputStyle,
	ThreadAutoArchiveDuration,
} from "discord.js"
import { errorEmbed, handleError, incrimentTicket } from "../../utils/GenUtils"
import Tickets from "../../schemas/Tickets"
import { mkdirSync, writeFileSync, readdirSync, readFileSync, rmSync } from "fs"
import path from "path"
import { config } from "../../utils/config"
import { escapeRegExp } from "lodash"
import TicketStatus from "../../schemas/TicketStatus"
import { resolveTicketStatusEmbed, updateTicketStatus } from "./TicketStatusUpdate"
import FastFlag from "../../schemas/FastFlag"
import { EventOptions } from "../../utils/RegisterEvents"
import { getGuildConfig, invalidateGuildConfig } from "../../utils/GuildConfigCache"
import { GuildChannels } from "../../schemas/GuildConfig"

// Ticket numbers to skip (reserved/sensitive numbers)
const SkipTickets = [1488, 69, 420, 69420, 67, 6767]

// Guard: true only for valid Discord snowflakes
const isSnowflake = (id: string | null | undefined): id is string =>
	typeof id === 'string' && /^\d{17,20}$/.test(id)

// Build a consistent transcript path for a channel
const transcriptDir = (channelId: string) =>
	path.join(__dirname, '../..', 'transcripts', channelId)

/* ────────────────────────────────────────────────────────────────
   Permission-overwrite helpers
   Always pass actual Role / GuildMember objects so Discord.js
   never has to resolve raw string IDs from the cache.
──────────────────────────────────────────────────────────────── */
function baseOverwrites(interaction: Interaction & { inCachedGuild(): true }) {
	// @everyone deny — use the cached Role object, never a raw string
	return [
		{
			id:   interaction.guild!.roles.everyone,
			type: OverwriteType.Role,
			deny: [
				PermissionsBitField.Flags.ViewChannel,
				PermissionsBitField.Flags.SendMessages,
				PermissionsBitField.Flags.ReadMessageHistory,
			],
		},
		{
			// interaction.member is always a GuildMember when inCachedGuild() is true
			id:    (interaction as any).member,
			type:  OverwriteType.Member,
			allow: [
				PermissionsBitField.Flags.ViewChannel,
				PermissionsBitField.Flags.SendMessages,
				PermissionsBitField.Flags.ReadMessageHistory,
				PermissionsBitField.Flags.AttachFiles,
			],
		},
	]
}

function roleOverwrite(role: Role) {
	return {
		id:    role,
		type:  OverwriteType.Role,
		allow: [
			PermissionsBitField.Flags.ViewChannel,
			PermissionsBitField.Flags.SendMessages,
			PermissionsBitField.Flags.ReadMessageHistory,
		],
	}
}

/* ────────────────────────────────────────────────────────────────
   Ticket-type map
──────────────────────────────────────────────────────────────── */
const TICKET_TYPE_MAP: Partial<Record<string, { configKey: keyof GuildChannels; channelPrefix: string }>> = {
	'open_ticket':          { configKey: 'ticketsCategoryGeneral',  channelPrefix: 'ticket'  },
	'open_ticket_general':  { configKey: 'ticketsCategoryGeneral',  channelPrefix: 'ticket'  },
	'open_ticket_trading':  { configKey: 'ticketsCategoryTrading',  channelPrefix: 'report'  },
	'open_ticket_market':   { configKey: 'ticketsCategoryMarket',   channelPrefix: 'market'  },
	'open_ticket_business': { configKey: 'ticketsCategoryBusiness', channelPrefix: 'inquiry' },
}

/* ────────────────────────────────────────────────────────────────
   Shared: increment ticket num, skipping reserved numbers
──────────────────────────────────────────────────────────────── */
async function nextTicketNum(guild: import('discord.js').Guild): Promise<number> {
	let num = await incrimentTicket(guild)
	if (SkipTickets.includes(num)) {
		Log.debug(`Ticket #${num} skipped (reserved).`)
		num = await incrimentTicket(guild)
	}
	return num
}

/* ────────────────────────────────────────────────────────────────
   Shared: create transcript files on disk
──────────────────────────────────────────────────────────────── */
function createTranscriptFiles(channelId: string, creatorId: string): boolean {
	const dir = transcriptDir(channelId)
	try {
		mkdirSync(dir, { recursive: true })
		writeFileSync(`${dir}/ticket_meta.json`, JSON.stringify({ creator: creatorId, ticketID: channelId, date: new Date() }))
		writeFileSync(`${dir}/ticket_transcript.md`, '')
		writeFileSync(`${dir}/ticket_transcript.txt`, '')
		mkdirSync(path.join(dir, 'media'), { recursive: true })
		return true
	} catch (err) {
		Log.error(err)
		rmSync(dir, { recursive: true, force: true })
		return false
	}
}

/* ════════════════════════════════════════════════════════════════
   Main event handler
════════════════════════════════════════════════════════════════ */
export default {
	name: Events.InteractionCreate,
	once: false,
	async execute(_: EventOptions, interaction: Interaction) {
		if (!interaction.inCachedGuild()) return

		/* ── Button interactions ── */
		if (interaction.isButton()) {
			const buttonID = interaction.customId

			/* ── Standard ticket-category buttons ── */
			if (TICKET_TYPE_MAP[buttonID]) {
				const { configKey, channelPrefix } = TICKET_TYPE_MAP[buttonID]!
				await interaction.deferReply({ flags: MessageFlags.Ephemeral })

				// Feature flag: tickets disabled via FastFlag
				const ticketsDisabled = await FastFlag.findOne({ refName: 'DisableTicketOpening', enabled: true })
				if (ticketsDisabled) {
					await interaction.editReply({ content: 'Tickets are currently disabled. Please try again later.' })
					return
				}

				// Feature flag: tickets disabled in guild config
				const guildCfg = await getGuildConfig(interaction.guildId!)
				if (guildCfg?.features?.tickets === false) {
					await interaction.editReply({ content: 'Tickets are currently disabled. Please try again later.' })
					return
				}

				// Ticket ban check
				if (interaction.member.roles.cache.find((r: Role) => r.name.toLowerCase() === 'ticket banned')) {
					await interaction.editReply(errorEmbed('You are banned from opening tickets.') as InteractionEditReplyOptions)
					return
				}

				// Duplicate open ticket check
				const findTicket = await Tickets.findOne({ guildID: interaction.guild.id, creatorID: interaction.user.id, status: true })
				if (findTicket) {
					const existing = interaction.guild.channels.cache.get(findTicket.channelID!)
					if (existing) {
						await interaction.editReply(errorEmbed('You already have a ticket open.') as InteractionEditReplyOptions)
						return
					}
					await findTicket.deleteOne()
				}

				// Resolve category — bust cache if not present (dashboard may have just updated)
				let activeCfg = guildCfg
				let catId = activeCfg?.channels?.[configKey]
				if (!isSnowflake(catId)) {
					invalidateGuildConfig(interaction.guildId!)
					activeCfg = await getGuildConfig(interaction.guildId!)
					catId = activeCfg?.channels?.[configKey]
				}
				if (!isSnowflake(catId)) {
					await interaction.editReply(errorEmbed("This ticket category isn't configured yet. Please contact an administrator.") as InteractionEditReplyOptions)
					return
				}

				// Prefer cache, fall back to API fetch
				const category = (
					(interaction.guild.channels.cache.get(catId) as CategoryChannel | undefined)
					?? (await interaction.guild.channels.fetch(catId).catch(() => null)) as CategoryChannel | null
				) ?? undefined

				if (!category) {
					await interaction.editReply(errorEmbed('Ticket category channel not found. Please verify the configuration.') as InteractionEditReplyOptions)
					return
				}

				// Staff role — resolve to actual Role object
				const rawStaffRoleId = activeCfg?.roles?.AssistantModerator || activeCfg?.roles?.Moderator || null
				const staffRole = isSnowflake(rawStaffRoleId)
					? (interaction.guild.roles.cache.get(rawStaffRoleId) ?? null)
					: null

				const ticketNum = await nextTicketNum(interaction.guild)

				// Build overwrites using actual objects (no raw string IDs)
				const permOverwrites = baseOverwrites(interaction)
				if (staffRole) permOverwrites.push(roleOverwrite(staffRole))

				const newChannel = await interaction.guild.channels.create({
					name:                `${channelPrefix}-${ticketNum}`,
					type:                ChannelType.GuildText,
					permissionOverwrites: permOverwrites,
					reason:              `Ticket opened by ${interaction.user.username}.`,
					parent:              category,
				}).catch(async (err: Error) => {
					await interaction.editReply(errorEmbed('Unable to create ticket channel! Please try again.') as InteractionEditReplyOptions)
					Log.error(err)
					return null
				})
				if (!newChannel) return

				if (!createTranscriptFiles(newChannel.id, interaction.user.id)) {
					await interaction.editReply(errorEmbed('Unable to create ticket transcript!') as InteractionEditReplyOptions)
					await newChannel.delete().catch(() => {})
					return
				}

				const ticketRow = new ActionRowBuilder<ButtonBuilder>()
					.addComponents(
						new ButtonBuilder().setCustomId('close_ticket').setStyle(ButtonStyle.Danger).setLabel('Close Ticket').setEmoji('✖'),
					)

				const ticketEmbed = new EmbedBuilder()
					.setAuthor({ name: `${interaction.user.username}'s Ticket`, iconURL: interaction.user.displayAvatarURL() || undefined })
					.setColor('Green')
					.setDescription('Please describe why you opened this ticket, a staff member will be with you shortly.\n\nIf you opened this ticket by mistake, leave a short response and close the ticket.')
					.setTimestamp()
					.setFooter({ text: 'Ticket transcripts are saved permanently.' })

				await newChannel.send({ content: `<@${interaction.user.id}> https://nohello.net`, embeds: [ticketEmbed], components: [ticketRow as any] })

				const newTicket = new Tickets({
					guildID:     interaction.guild.id,
					creatorID:   interaction.user.id,
					users:       [],
					channelID:   newChannel.id,
					claimedID:   'None',
					closeReason: 'None',
					status:      true,
					autoClose:   0,
				})
				await newTicket.save().catch(async (err: Error) => {
					await interaction.editReply(errorEmbed('Failed to create ticket file!') as InteractionEditReplyOptions)
					Log.error(err)
					await newChannel.delete().catch((e: Error) => { Log.error('Failed to delete ticket channel!\n\n' + e.stack) })
				})

				await interaction.editReply({ content: `Your ticket has been created. <#${newChannel.id}>` })
				return
			}

			/* ── Non-ticket-type buttons ── */
			switch (buttonID) {

				/* ── Internal Affairs prompt ── */
				case 'open_internal_affair': {
					const embed = new EmbedBuilder()
						.setTitle('New Internal Affair Report')
						.setColor('Red')
						.setDescription(
							'This feature will open a ticket, used to report staff misconduct or staff grievances. '
							+ 'This ticket will only be able to be viewed by Internal Reviewers.'
							+ '\n\n**Click "Open Ticket" below to acknowledge this feature\'s intended usage**, and to open an Internal Affair Ticket.',
						)
					const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder().setLabel('Nevermind').setCustomId('internal-affair-nevermind').setStyle(ButtonStyle.Danger),
						new ButtonBuilder().setLabel('Open Ticket').setCustomId('internal-affair-open-ticket').setStyle(ButtonStyle.Primary),
					)
					await interaction.reply({ flags: MessageFlags.Ephemeral, embeds: [embed], components: [row as any] })
					break
				}

				/* ── Internal Affairs: nevermind ── */
				case 'internal-affair-nevermind': {
					await interaction.update({ embeds: [], components: [], content: "Ok, I've cancelled your request." })
					break
				}

				/* ── Internal Affairs: open ticket ── */
				case 'internal-affair-open-ticket': {
					await interaction.update({ embeds: [], components: [], content: 'Opening a ticket…' })

					const ticketsDisabled = await FastFlag.findOne({ refName: 'DisableTicketOpening', enabled: true })
					if (ticketsDisabled) {
						await interaction.editReply({ content: 'Tickets are currently disabled. Please try again later.' })
						return
					}

					if (interaction.member.roles.cache.find((r: Role) => r.name.toLowerCase() === 'ticket banned')) {
						await interaction.editReply(errorEmbed('You are banned from opening tickets.') as InteractionEditReplyOptions)
						return
					}

					// Duplicate ticket check
					const findTicket = await Tickets.findOne({ guildID: interaction.guild.id, creatorID: interaction.user.id, status: true })
					if (findTicket) {
						const existing = await interaction.guild.channels.fetch(findTicket.channelID!).catch(() => null)
						if (existing) {
							await interaction.editReply(errorEmbed('You already have a ticket open.') as InteractionEditReplyOptions)
							return
						}
						await findTicket.deleteOne()
					}

					// Resolve Internal Affairs category
					const iaCfg = await getGuildConfig(interaction.guildId!)
					const iaCatId = iaCfg?.channels?.internalAffairs

					let iaCategory: CategoryChannel | undefined
					if (isSnowflake(iaCatId)) {
						iaCategory = (
							(interaction.guild.channels.cache.get(iaCatId) as CategoryChannel | undefined)
							?? (await interaction.guild.channels.fetch(iaCatId).catch(() => null)) as CategoryChannel | null
							?? undefined
						)
					}
					// Fallback: find a category named "Internal Affairs"
					if (!iaCategory) {
						iaCategory = interaction.guild.channels.cache.find(
							(c): c is CategoryChannel => c.name.toLowerCase() === 'internal affairs' && c.type === ChannelType.GuildCategory,
						)
					}
					if (!iaCategory) {
						await interaction.editReply(errorEmbed('No Internal Affairs category configured. Set it in the NEST dashboard or create a category named "Internal Affairs".') as InteractionEditReplyOptions)
						return
					}

					// Internal Reviewer role — resolve to actual Role object
					const irRoleId = iaCfg?.roles?.InternalReviewer
					const internalReviewer = isSnowflake(irRoleId)
						? (interaction.guild.roles.cache.get(irRoleId) ?? interaction.guild.roles.cache.find(r => r.name === 'Internal Reviewer'))
						: interaction.guild.roles.cache.find(r => r.name === 'Internal Reviewer')

					const ticketNum = await nextTicketNum(interaction.guild)

					// Build overwrites using actual objects
					const iaOverwrites = baseOverwrites(interaction)
					if (internalReviewer) iaOverwrites.push(roleOverwrite(internalReviewer))

					const newChannel = await interaction.guild.channels.create({
						name:                 `internal-affair-${ticketNum}`,
						type:                 ChannelType.GuildText,
						permissionOverwrites: iaOverwrites,
						reason:               `Internal Affair opened by ${interaction.user.username}.`,
						parent:               iaCategory,
					}).catch(async (err: Error) => {
						await interaction.editReply(errorEmbed('Unable to create ticket channel! Please try again.') as InteractionEditReplyOptions)
						Log.error(err)
						return null
					})
					if (!newChannel) return

					if (!createTranscriptFiles(newChannel.id, interaction.user.id)) {
						await interaction.editReply(errorEmbed('Unable to create ticket transcript!') as InteractionEditReplyOptions)
						await newChannel.delete().catch(() => {})
						return
					}

					const iaTicketRow = new ActionRowBuilder<ButtonBuilder>()
						.addComponents(
							new ButtonBuilder().setCustomId('close_ticket').setStyle(ButtonStyle.Danger).setLabel('Close Ticket').setEmoji('✖'),
						)

					const iaEmbed = new EmbedBuilder()
						.setAuthor({ name: `${interaction.user.username}'s Internal Affair Report`, iconURL: interaction.user.displayAvatarURL() || undefined })
						.setColor(0xf1c40f)
						.setDescription(
							'Thank you for taking the time to open an Internal Affair Report, where you can report staff misconduct or any other staff related grievances. '
							+ 'Please describe the following in detail so we can work on your case as fast as possible:\n\n'
							+ '- Which staff are you reporting?\n'
							+ '- What are you reporting them for?\n'
							+ '- What proof do you have regarding this report?\n'
							+ '- What would you hope is done about this matter?\n'
							+ '- Any other information?\n\n'
							+ 'All content in this report is as confidential as possible between you, internal reviewers, and server managers.',
						)
						.setTimestamp()
						.setFooter({ text: 'Ticket transcripts are saved permanently and are viewable by non-internal reviewers.' })

					await newChannel.send({ content: `<@${interaction.user.id}>`, embeds: [iaEmbed], components: [iaTicketRow as any] })

					const newTicket = new Tickets({
						guildID:     interaction.guild.id,
						creatorID:   interaction.user.id,
						users:       [],
						channelID:   newChannel.id,
						claimedID:   'None',
						closeReason: 'None',
						status:      true,
						autoClose:   0,
					})
					await newTicket.save().catch(async (err: Error) => {
						await interaction.editReply(errorEmbed('Failed to create ticket file!') as InteractionEditReplyOptions)
						Log.error(err)
						await newChannel.delete().catch((e: Error) => { Log.error('Failed to delete ticket channel!\n\n' + e.stack) })
					})

					await interaction.editReply({ content: `Your internal affair report has been created. <#${newChannel.id}>` })
					break
				}

				/* ── Close ticket (shows reason modal) ── */
				case 'close_ticket': {
					const findingTicket = await Tickets.findOne({ guildID: interaction.guild.id, channelID: interaction.channel?.id })
					if (!findingTicket) return

					if (interaction.user.id !== findingTicket.creatorID) {
						const asstModPos = interaction.member.roles.cache.find((r: Role) => r.name.toLowerCase() === 'assistant moderator')?.position ?? 0
						const seniorMktPos = interaction.member.roles.cache.find((r: Role) => r.name.toLowerCase() === 'senior marketplace moderator')?.position ?? 0
						const highestPos = interaction.member.roles.highest.position
						if (asstModPos > highestPos || seniorMktPos > highestPos) {
							await interaction.reply({ flags: MessageFlags.Ephemeral, ...errorEmbed('You must be the ticket creator to close the ticket!') as any })
							return
						}
					}

					const modal = new ModalBuilder().setCustomId('modal_close_reason').setTitle('Enter a Reason')
					modal.addComponents(
						new ActionRowBuilder<TextInputBuilder>().setComponents(
							new TextInputBuilder()
								.setCustomId('close_reason')
								.setLabel('Reason')
								.setPlaceholder('Ticket resolved.')
								.setRequired(true)
								.setMaxLength(250)
								.setStyle(TextInputStyle.Paragraph),
						),
					)
					await interaction.showModal(modal as any)
					break
				}

				/* ── Log transcript ── */
				case 'log_transcript': {
					await interaction.deferReply({ flags: MessageFlags.Ephemeral })

					const asstModPos = interaction.member.roles.cache.find((r: Role) => r.name.toLowerCase() === 'assistant moderator')?.position ?? 0
					const seniorMktPos = interaction.member.roles.cache.find((r: Role) => r.name.toLowerCase() === 'senior marketplace moderator')?.position ?? 0
					if (asstModPos > interaction.member.roles.highest.position || seniorMktPos > interaction.member.roles.highest.position) {
						await interaction.editReply(errorEmbed('You must be an Assistant Moderator to use this!') as InteractionEditReplyOptions)
						return
					}

					const foundTicket = await Tickets.findOne({ guildID: interaction.guild.id, channelID: interaction.channel?.id })
					if (!foundTicket) return

					await interaction.channel?.send({ content: 'Transcript and media being sent to the transcripts channel now.' })
					transcriptString(interaction.channel?.name!, interaction.channel?.id!, interaction, interaction.user.id)

					const logRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder().setCustomId('log_transcript').setStyle(ButtonStyle.Secondary).setLabel('Log Transcript').setDisabled(true).setEmoji('📰'),
						new ButtonBuilder().setCustomId('delete_ticket').setStyle(ButtonStyle.Danger).setLabel('Delete Ticket').setEmoji('🗑'),
					)
					await interaction.message.edit({ components: [logRow as any] })
					await interaction.editReply({ content: 'Transcript logged.' })
					break
				}

				/* ── Delete ticket ── */
				case 'delete_ticket': {
					await interaction.deferReply({})

					const asstModPos = interaction.member.roles.cache.find((r: Role) => r.name.toLowerCase() === 'assistant moderator')?.position ?? 0
					const seniorMktPos = interaction.member.roles.cache.find((r: Role) => r.name.toLowerCase() === 'senior marketplace moderator')?.position ?? 0
					if (asstModPos > interaction.member.roles.highest.position || seniorMktPos > interaction.member.roles.highest.position) {
						await interaction.editReply(errorEmbed('You must be an Assistant Moderator to use this!') as InteractionEditReplyOptions)
						return
					}

					await Tickets.findOneAndDelete({ guildID: interaction.guild.id, channelID: interaction.channel?.id })

					const deleteRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder().setCustomId('log_transcript').setStyle(ButtonStyle.Secondary).setLabel('Log Transcript').setDisabled(true).setEmoji('📰'),
						new ButtonBuilder().setCustomId('delete_ticket').setStyle(ButtonStyle.Danger).setLabel('Delete Ticket').setDisabled(true).setEmoji('🗑'),
					)
					await interaction.message.edit({ components: [deleteRow as any] })
					await interaction.editReply({ content: 'Ticket file deleted, deleting channel soon.' })

					setTimeout(async () => {
						rmSync(transcriptDir(interaction.channel?.id!), { recursive: true, force: true })
						await interaction.channel?.delete('Ticket closed')
					}, 10_000)
					break
				}

				/* ── Request close (by ticket creator) ── */
				case 'req_close': {
					await interaction.deferReply({ flags: MessageFlags.Ephemeral })

					const reqTicket = await Tickets.findOne({ guildID: interaction.guild.id, channelID: interaction.channel?.id, status: true })
					if (!reqTicket) {
						await interaction.editReply(errorEmbed('Ticket already closed.') as InteractionEditReplyOptions)
						return
					}
					if (reqTicket.creatorID !== interaction.user.id) {
						await interaction.editReply({ content: 'This is not your button!' })
						return
					}

					await reqTicket.updateOne({ status: false })

					// Disable the req_close / req_keep_open buttons on the original message
					const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
						ButtonBuilder.from((interaction.message.components[0] as any).components[0] as APIButtonComponent).setDisabled(true),
						ButtonBuilder.from((interaction.message.components[0] as any).components[1] as APIButtonComponent).setDisabled(true),
					)
					await interaction.message.edit({ components: [disabledRow as any] })

					const closedRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder().setCustomId('close_ticket').setStyle(ButtonStyle.Danger).setLabel('Close Ticket').setDisabled(true).setEmoji('✖'),
						new ButtonBuilder().setCustomId('log_transcript').setStyle(ButtonStyle.Secondary).setLabel('Log Transcript').setEmoji('📰'),
					)

					const closedEmbed = new EmbedBuilder()
						.setAuthor({ name: `Ticket Closed - ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() || undefined })
						.setDescription(
							`Ticket has been closed. The ticket creator, and any added users have been removed and can no longer view the ticket.\n`
							+ `**Reason:** ${reqTicket.closeReason}\n\n`
							+ 'Click `Log Transcript` to log the transcript.',
						)
						.setColor('Green')
						.setTimestamp()

					await interaction.channel?.send({ embeds: [closedEmbed], components: [closedRow as any] })

					const dmEmbed = new EmbedBuilder()
						.setAuthor({ name: 'Ticket Closed', iconURL: interaction.guild.iconURL() || undefined })
						.setDescription(
							`Ticket \`#${interaction.channel?.name.split('-')[1]}\` has been closed!\n\n`
							+ `${config.bulletpointEmoji} **Reason:** ${reqTicket.closeReason}`,
						)
						.setColor('Green')
						.setTimestamp()

					await interaction.channel?.edit({ name: `closed-${interaction.channel.name.split('-')[1]}` }).catch(async (err: Error) => {
						handleError(err)
						await interaction.editReply(errorEmbed(`An error occurred!\n\`${err.name}\``) as InteractionEditReplyOptions)
					})

					// Remove creator access — pass explicit type so no cache lookup needed
					await (interaction.channel as TextChannel).permissionOverwrites.edit(
						reqTicket.creatorID!,
						{ ViewChannel: false, SendMessages: false, ReadMessageHistory: false },
						{ type: OverwriteType.Member },
					)
					const creator = interaction.client.users.cache.get(reqTicket.creatorID!)
					if (creator) creator.send({ embeds: [dmEmbed] }).catch(() => {})

					for (const userId of reqTicket.users) {
						await (interaction.channel as TextChannel).permissionOverwrites.edit(
							userId,
							{ ViewChannel: false, SendMessages: false, ReadMessageHistory: false },
							{ type: OverwriteType.Member },
						)
						const user = interaction.client.users.cache.get(userId)
						if (user) await user.send({ embeds: [dmEmbed] }).catch(() => {})
					}

					await interaction.editReply({ content: 'Ticket closed.' })
					break
				}

				/* ── Request keep open (by ticket creator) ── */
				case 'req_keep_open': {
					await interaction.deferReply({ flags: MessageFlags.Ephemeral })

					const reqTicket2 = await Tickets.findOne({ guildID: interaction.guild.id, channelID: interaction.channel?.id, status: true })
					if (!reqTicket2) {
						await interaction.editReply(errorEmbed('Ticket already closed.') as InteractionEditReplyOptions)
						return
					}
					if (reqTicket2.creatorID !== interaction.user.id) {
						await interaction.editReply({ content: 'This is not your button!' })
						return
					}

					await reqTicket2.updateOne({ closeReason: 'None' })

					const keepOpenRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
						ButtonBuilder.from((interaction.message.components[0] as any).components[0] as APIButtonComponent).setDisabled(true),
						ButtonBuilder.from((interaction.message.components[0] as any).components[1] as APIButtonComponent).setDisabled(true),
					)
					await interaction.message.edit({ components: [keepOpenRow as any] })
					await interaction.channel?.send({ content: 'Close request denied!' }).catch(() => {})
					await interaction.editReply({ content: 'Cancelled close request.' })
					break
				}
			}

			/* ── Update ticket status message after every button ── */
			try {
				const ticketStatusDoc = await TicketStatus.findOne({ guildId: interaction.guildId })
				const status = await updateTicketStatus()
				if (ticketStatusDoc && ticketStatusDoc.ticketStatus !== status) {
					const statusChannel = await interaction.guild.channels.fetch(ticketStatusDoc.channelId!).catch(() => null) as TextChannel | null
					if (statusChannel) {
						let prevMsg: Message<true> | null = null
						try { prevMsg = await statusChannel.messages.fetch(ticketStatusDoc.messageId!) } catch {}
						await prevMsg?.delete()

						const tEmbed = await resolveTicketStatusEmbed(status)
						const newMsg = await statusChannel.send({ embeds: [tEmbed] })

						await ticketStatusDoc.deleteOne()
						await TicketStatus.create({
							guildId:      interaction.guildId,
							channelId:    newMsg.channelId,
							messageId:    newMsg.id,
							ticketStatus: status,
						})
					}
				}
			} catch (err) {
				Log.error(`Failed to update ticket status: ${err}`)
			}

		/* ── Modal interactions ── */
		} else if (interaction.isModalSubmit()) {
			if (interaction.customId !== 'modal_close_reason') return
			await interaction.deferReply({ flags: MessageFlags.Ephemeral })

			const foundTicket = await Tickets.findOne({ guildID: interaction.guild.id, channelID: interaction.channel?.id, status: true })
			if (!foundTicket) {
				await interaction.editReply(errorEmbed('Ticket already closed.') as InteractionEditReplyOptions)
				return
			}

			const reason = interaction.fields.getTextInputValue('close_reason') || 'No reason provided.'
			await foundTicket.updateOne({ closeReason: reason, status: false })

			// Disable close button on original message
			const disabledCloseRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder().setCustomId('close_ticket').setStyle(ButtonStyle.Danger).setLabel('Close Ticket').setDisabled(true).setEmoji('✖'),
			)
			await interaction.message?.edit({ components: [disabledCloseRow as any] })

			const logRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder().setCustomId('log_transcript').setStyle(ButtonStyle.Secondary).setLabel('Log Transcript').setEmoji('📰'),
			)

			const closedEmbed = new EmbedBuilder()
				.setAuthor({ name: `Ticket Closed - ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() || undefined })
				.setDescription(
					`Ticket has been closed. The ticket creator, and any added users have been removed and can no longer view the ticket.\n`
					+ `**Reason:** ${reason}\n\n`
					+ 'Click `Log Transcript` to log the transcript.',
				)
				.setColor('Green')
				.setTimestamp()

			await interaction.channel?.send({ embeds: [closedEmbed], components: [logRow as any] })

			const dmEmbed = new EmbedBuilder()
				.setAuthor({ name: 'Ticket Closed', iconURL: interaction.guild.iconURL() || undefined })
				.setDescription(
					`Ticket \`#${interaction.channel?.name.split('-')[1]}\` has been closed!\n\n`
					+ `${config.bulletpointEmoji} **Reason:** ${reason}`,
				)
				.setColor('Green')
				.setTimestamp()

			await interaction.channel?.edit({ name: `closed-${interaction.channel.name.split('-')[1]}` }).catch(async (err: Error) => {
				handleError(err)
				await interaction.editReply(errorEmbed(`An error occurred!\n\`${err.name}\``) as InteractionEditReplyOptions)
			})

			// Remove creator access — pass explicit type
			await (interaction.channel as TextChannel).permissionOverwrites.edit(
				foundTicket.creatorID!,
				{ ViewChannel: false, SendMessages: false, ReadMessageHistory: false },
				{ type: OverwriteType.Member },
			)
			const creator = interaction.client.users.cache.get(foundTicket.creatorID!)
			if (creator) creator.send({ embeds: [dmEmbed] }).catch(() => {})

			for (const userId of foundTicket.users) {
				await (interaction.channel as TextChannel).permissionOverwrites.edit(
					userId,
					{ ViewChannel: false, SendMessages: false, ReadMessageHistory: false },
					{ type: OverwriteType.Member },
				)
				const user = interaction.client.users.cache.get(userId)
				if (user) await user.send({ embeds: [dmEmbed] }).catch(() => {})
			}

			await interaction.editReply({ content: 'Ticket closed.' })
		}
	},
}

/* ════════════════════════════════════════════════════════════════
   Helpers
════════════════════════════════════════════════════════════════ */

async function getTicketTranscriptByID(id: string) {
	try {
		const dir = transcriptDir(id)
		const media = readdirSync(path.join(dir, 'media'))
		const md    = readFileSync(path.join(dir, 'ticket_transcript.md'))
		const txt   = readFileSync(path.join(dir, 'ticket_transcript.txt'))
		return { media, md, txt }
	} catch (err) {
		Log.error(err)
		handleError(err as any)
	}
	return null
}

async function transcriptString(ticketname: string, ticket_id: string, interaction: Interaction, closerID: string) {
	const scriptsChannel = interaction.guild!.channels.cache.find(c => c.name.toLowerCase() === 'transcripts') as TextChannel | undefined
	if (!scriptsChannel) return

	const foundTicket = await Tickets.findOne({ guildID: interaction.guild?.id, channelID: ticket_id })
	if (!foundTicket) return

	const user = await interaction.client.users.fetch(foundTicket.creatorID!)
	const results = await getTicketTranscriptByID(ticket_id)

	const transcriptEmbed = new EmbedBuilder()
		.setAuthor({ name: `Ticket #${(interaction.channel as TextChannel)?.name.split('-')[1]} Transcript`, iconURL: interaction.guild?.iconURL() || undefined })
		.setThumbnail(user.displayAvatarURL() || null)
		.setDescription(
			`${config.bulletpointEmoji} **Creator:** <@${foundTicket.creatorID}>\n`
			+ `${config.bulletpointEmoji} **Closer:** <@${closerID}>\n`
			+ `${config.bulletpointEmoji} **Reason:** ${foundTicket.closeReason}`,
		)
		.setColor('Green')
		.setTimestamp()

	if (!results) {
		// Fallback: no transcript session found — fetch recent messages
		const fetched = await interaction.channel?.messages.fetch({ limit: 100 })
		if (!fetched) return
		let s = ''
		for (const msg of Array.from(fetched.values())) {
			s += `From ${msg.author.tag} (${msg.author.id})\n    ${msg.content ?? ''}\n`
		}
		const buffer = Buffer.from(escapeRegExp(s), 'utf-8')
		const msg = await scriptsChannel.send({ embeds: [transcriptEmbed] })
		const thread = await msg.startThread({
			name:                `Ticket #${(interaction.channel as TextChannel)?.name.split('-')[1]}`,
			autoArchiveDuration: 60,
			reason:              'Transcript',
		})
		await thread.send({ files: [{ attachment: buffer, name: ticketname + '.txt' }] })
		return
	}

	const msg = await scriptsChannel.send({
		embeds: [transcriptEmbed],
		files:  [
			{ attachment: results.md,  name: ticketname + '.md'  },
			{ attachment: results.txt, name: ticketname + '.txt' },
		],
	})
	const thread = await msg.startThread({
		name:                `Ticket-${(interaction.channel as TextChannel)?.name.split('-')[1]} Media`,
		autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
		reason:              'Ticket Media',
	})
	for (const mediaFile of results.media) {
		await thread.send({
			content: mediaFile,
			files:   [path.join(transcriptDir(ticket_id), 'media', mediaFile)],
		})
	}
}
