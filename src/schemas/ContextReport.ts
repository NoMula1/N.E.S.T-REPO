import mongoose from "mongoose"

export interface ContextReport {
	reportingUserID: string;
	reportedUserID: string;
	message: {
		url: string;
		content: string;
	};
	lastFiveMessages: {
		url: string;
		content: string;
	}[];
}

const schema = new mongoose.Schema<ContextReport>({
	reportingUserID: String,
	reportedUserID: String,
	message: { url: String, content: String },
	lastFiveMessages: [{ url: String, content: String }]
}, {
	timestamps: true
})

export default mongoose.model<ContextReport>("contextreport", schema)