import mongoose from "mongoose"

export interface Ban {
	guildID: string;
	userID: string;
	target: {
		id: string;
		username: string;
	};
	moderator: {
		id: string;
		username: string;
	};
	guild: {
		id: string;
		name: string;
	};
	reason: string;
	caseNumber: number;
	endDate: number;
	at: Date;
}

const schema = new mongoose.Schema<Ban>({
	guildID: String,
	userID: String,
	target: {
		id: String,
		username: String
	},
	moderator: {
		id: String,
		username: String
	},
	guild: {
		id: String,
		name: String
	},
	reason: String,
	caseNumber: Number,
	endDate: Number,
	at: Date
})

export default mongoose.model<Ban>("ban", schema)
