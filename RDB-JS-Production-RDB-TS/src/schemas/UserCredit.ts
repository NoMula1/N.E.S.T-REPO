import mongoose from "mongoose"

export interface UserCredit {
	userID: string;
	creditsMilliseconds: number;
	lastRenewed: Date;
	totalHours: number;
}

const schema = new mongoose.Schema<UserCredit>({
	userID: String,
	creditsMilliseconds: Number,
	lastRenewed: Date,
	totalHours: Number
}, {
	timestamps: true
})

export default mongoose.model<UserCredit>("usercredit", schema)