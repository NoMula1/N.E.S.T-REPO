import mongoose from "mongoose"

export interface MemberStatistics {
	member: string;
	points: number;
	lastPointsAwarded: number;
	/** Regular messages (including ones with attachments and ones that are replies) */
	regular: number;
	/** Messages containing attachments */
	attachments: number;
	/** Messages which have a `.reference` property */
	replies: number;
}

const schema = new mongoose.Schema<MemberStatistics>({
	member: {
		type: String,
		required: true,
		unique: true
	},
	points: {
		type: Number,
		required: true
	},
	lastPointsAwarded: {
		type: Number,
		required: true
	},
	regular: Number,
	attachments: Number,
	replies: Number,
})

export default mongoose.model<MemberStatistics>("memberstatistics", schema)
