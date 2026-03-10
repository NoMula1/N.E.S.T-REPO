import mongoose from "mongoose"

export interface ModMail {
	userID: string;
	messageID: string;
	messageContent: string;
	channelID: string;
	author: string;
	authorTag: string;
	authorDisplay: string;
	count: number;
}

const schema = new mongoose.Schema<ModMail>({
	userID: String,
	messageID: String,
	messageContent: String,
	channelID: String,
	author: String,
	authorTag: String,
	authorDisplay: String,
	count: Number,
})

export default mongoose.model<ModMail>("modmail", schema)