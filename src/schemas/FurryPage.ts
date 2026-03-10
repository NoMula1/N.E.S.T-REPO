import mongoose from "mongoose"

export interface FurryPage {
	pageId: number;
	nextImageId: number;
	totalImages: number;
}

const schema = new mongoose.Schema<FurryPage>({
	pageId: Number,
	nextImageId: Number,
	totalImages: Number
})

export default mongoose.model<FurryPage>("FurryPage", schema)
