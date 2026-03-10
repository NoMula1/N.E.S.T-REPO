import mongoose, { Schema } from "mongoose"

export interface Settings {
	guildID: string;
	caseCount: number;
	ticketCount: number;
	suggestionCount: number;
	requirePostApproval: boolean;
	/**
	 * The percentage of posts that are auto-approved.
	 * - 0 no auto-approval
	 * - 1 always auto-approve
	 */
	postApprovalLottery: number;
	forHireChannel: string;
	hiringChannel: string;
	sellingChannel: string;
	restartInvokeMessageId: string;
	banImageLink: string;
	bannedImagesThreshold: number
}

const schema = new mongoose.Schema<Settings>({
	guildID: String,
	caseCount: Number,
	ticketCount: Number,
	suggestionCount: Number,
	requirePostApproval: Boolean,
	postApprovalLottery: {
		type: Number,
		min: 0,
		max: 1
	},
	forHireChannel: String,
	hiringChannel: String,
	sellingChannel: String,
	restartInvokeMessageId: String,
	banImageLink: String,
	bannedImagesThreshold: {
		type: Number,
		min: 0,
		max: 1
	}
})

export default mongoose.model<Settings>("setting", schema)