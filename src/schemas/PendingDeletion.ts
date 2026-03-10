import mongoose from "mongoose"

export interface PendingDeletion {
	userID: string;
}

const schema = new mongoose.Schema<PendingDeletion>({
	userID: String
}, {
	timestamps: true
})

export default mongoose.model<PendingDeletion>("pendingdeletion", schema)