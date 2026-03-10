import mongoose from "mongoose"
import { FurryImage } from "./FurryImage"

export interface SonicImage extends FurryImage {}

const schema = new mongoose.Schema<SonicImage>({
	imageId: Number,
	postId: Number,
	imageUrl: String,
	sourceUrl: String,
	authorName: String
})

export default mongoose.model<SonicImage>("SonicImage", schema)