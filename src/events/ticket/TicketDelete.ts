import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, TextChannel } from "discord.js"
import Tickets from "../../schemas/Tickets"
import { handleError, errorEmbed } from "../../utils/GenUtils"
import { config } from "../../utils/config"
import CoreClient from "../../bootstrap/CoreClient"

export async function checkTickets() {
	const tickets = await Tickets.find({
		autoClose: { $lt: Date.now() / 1000 },
		status: true
	})

	if (!tickets || tickets.length <= 0) return

	tickets.forEach(async (singleTicket) => {
		if (singleTicket.autoClose == 0) return

		await singleTicket.updateOne({
			status: false,
			closeReason: "Auto Close: Failure to respond to close request."
		})
		const guild = await CoreClient.instance.guilds.fetch(singleTicket.guildID!)
		if (!guild) {
			await singleTicket.deleteOne()
			return
		}
		const ticketChannel = await guild.channels.fetch(singleTicket.channelID!)
		if (ticketChannel?.type !== ChannelType.GuildText) return
		if (!ticketChannel) {
			await singleTicket.deleteOne()
			return
		}
		const member = await guild.members.fetch(singleTicket.creatorID!)

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
			.setAuthor({ name: `Ticket Closed - ${member.user.username}`, iconURL: member.user.displayAvatarURL() || undefined })
			.setDescription(`Ticket has been closed. The ticket creator, and any added users have been removed and can no longer view the ticket.
						**Reason:** Auto Close: Failure to respond to close request.
						
						Click \`Log Transcript\` to log the transcript.`)
			.setColor("Green")
			.setTimestamp()
		ticketChannel.send({ embeds: [ticketClosed], components: [ticketRowReq.toJSON()] })

		const ticketClosedDM = new EmbedBuilder()
			.setAuthor({ name: "Ticket Closed", iconURL: guild.iconURL() || undefined })
			.setDescription(`Ticket \`#${ticketChannel.name.split('-')[1]}\` has been closed!
						
						${config.bulletpointEmoji} **Reason:** Auto Close: Failure to respond to close request.`)
			.setColor("Green")
			.setTimestamp()


		await ticketChannel.edit({
			name: `closed-${ticketChannel.name.split('-')[1]}`
		}).catch(async (err: Error) => {
			handleError(err)
			return
		})
		await ticketChannel.permissionOverwrites.edit(singleTicket.creatorID!, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false })
		const creator = CoreClient.instance.users.cache.get(singleTicket.creatorID!)
		if (creator) {
			creator.send({ embeds: [ticketClosedDM] }).catch(() => { })
		}
		for (const user of singleTicket.users) {
			await ticketChannel.permissionOverwrites.edit(user, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false })
			const foundUser = CoreClient.instance.users.cache.get(user)
			if (!foundUser) return
			await foundUser.send({ embeds: [ticketClosedDM] }).catch(() => { })
		}

	})
}
setInterval(checkTickets, 10 * 1000) 