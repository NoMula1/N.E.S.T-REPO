import mongoose from "mongoose"

export interface RoleBan {
	guildID: string;
	userID: string;
	roleID: string;
	type: string;
	caseNumber: number;
	endDate: number;
}

const schema = new mongoose.Schema<RoleBan>({
	guildID: String,
	userID: String,
	roleID: String,
	type: String,
	caseNumber: Number,
	endDate: Number
})

export default mongoose.model<RoleBan>("roleban", schema)