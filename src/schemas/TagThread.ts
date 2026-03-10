import mongoose from "mongoose"

export interface TagThread {
	creatorId: string;
	channelId: string;
	tagBits: number;
	createdAt: Date;
	updatedAt: Date;
}

const schema = new mongoose.Schema<TagThread>({
	creatorId: String,
	channelId: String,
	tagBits: Number
}, {
	timestamps: true
})

export default mongoose.model<TagThread>("tagthread", schema)