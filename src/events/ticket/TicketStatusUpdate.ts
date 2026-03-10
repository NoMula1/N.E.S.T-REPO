import { EmbedBuilder } from "discord.js"
import Tickets from "../../schemas/Tickets"

export enum ticketStatus {
	NEUTRAL = "NEUTRAL",
	SLOWER = "SLOWER",
	SLOWEST = "SLOWEST"
}

const ticketStatusTitles: any = {
	NEUTRAL: "Neutral Performance",
	SLOWER: "Degraded Performance",
	SLOWEST: "Severely Degraded Performance"
}

export const ticketStatusCorellation: any = {
	NEUTRAL: "Tickets are being handled at a neutral rate, and your ticket should see a response soon.",
	SLOWER: "Tickets are being handled at a degraded rate, so your ticket may be less of a priority, and should be handled once other tickets have been resolved.",
	SLOWEST: "Tickets are being handled at a **severely** degraded rate, so your ticket may take a very long time before it sees a response."
}

export async function updateTicketStatus(): Promise<ticketStatus> {
	const activeTickets = await Tickets.find({
		status: true
	})

	if (activeTickets.length <= 9)
		return ticketStatus.NEUTRAL
	if (activeTickets.length >= 26)
		return ticketStatus.SLOWEST
	return ticketStatus.SLOWER
}

export async function resolveTicketStatusEmbed(currentStatus: ticketStatus) {
	// const currentStatus = await updateTicketStatus()
	let color
	if (currentStatus === ticketStatus.NEUTRAL) {
		color = 0xA2E4B8
	} else if (currentStatus === ticketStatus.SLOWER) {
		color = 0xff9913
	} else {
		color = 0xFF6D6A
	}

	const embed = new EmbedBuilder()
		.setTitle(ticketStatusTitles[currentStatus])
		.setDescription(ticketStatusCorellation[currentStatus])
		.setColor(color)

	return embed
}