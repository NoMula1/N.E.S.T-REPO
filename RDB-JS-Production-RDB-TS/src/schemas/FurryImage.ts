import mongoose from "mongoose"

export interface FurryImage extends mongoose.Document<FurryImage> {
	imageId: number;
	postId: number;
	imageUrl: string;
	sourceUrl: string;
	authorName: string;
}

const schema = new mongoose.Schema<FurryImage>({
	imageId: Number,
	postId: Number,
	imageUrl: String,
	sourceUrl: String,
	authorName: String
})

export default mongoose.model<FurryImage>("FurryImage", schema)