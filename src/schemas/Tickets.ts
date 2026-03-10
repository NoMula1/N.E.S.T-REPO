import mongoose from "mongoose"

export interface Ticket {
	guildID: string;
	creatorID: string;
	users: string[];
	channelID: string;
	claimedID: string;
	closeReason: string;
	status: boolean;
	autoClose: number;
}

const schema = new mongoose.Schema<Ticket>({
	guildID: String,
	creatorID: String,
	users: Array,
	channelID: String,
	claimedID: String,
	closeReason: String,
	status: Boolean,
	autoClose: Number,
})

export default mongoose.model<Ticket>("ticket", schema)