import mongoose from "mongoose"

export interface Case {
	guildID: string;
	userID: string;
	modID: string;
	caseNumber: number;
	caseType: string;
	reason: string;
	duration: string;
	durationUnix: number;
	active: boolean;
	dateIssued: number;
}

const schema = new mongoose.Schema({
	guildID: String,
	userID: String,
	modID: String,
	caseNumber: Number,
	caseType: String,
	reason: String,
	duration: String,
	durationUnix: Number,
	active: Boolean,
	dateIssued: Number,
})

export default mongoose.model<Case>("case", schema)