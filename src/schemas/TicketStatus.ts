import mongoose from "mongoose"

export interface TicketStatus {
	guildId: string;
	channelId: string;
	messageId: string;
	ticketStatus: string;
}

const schema = new mongoose.Schema<TicketStatus>({
	guildId: String,
	channelId: String,
	messageId: String,
	ticketStatus: String, // "NEUTRAL", "SLOW", "SLOWEST"
})

export default mongoose.model<TicketStatus>("ticketstatus", schema)