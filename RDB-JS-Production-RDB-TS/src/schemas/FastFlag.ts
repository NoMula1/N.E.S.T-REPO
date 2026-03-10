import mongoose from "mongoose"

export interface FastFlag {
	refName: string;
	enabled: boolean;
	enabledBy: string|undefined;
	description: string;
	createdAt: Date;
	updatedAt: Date;
}

const schema = new mongoose.Schema<FastFlag>({
	refName: String,
	enabled: Boolean,
	enabledBy: String,
	description: String,
}, {
	timestamps: true
})

export default mongoose.model<FastFlag>("fastflag", schema)