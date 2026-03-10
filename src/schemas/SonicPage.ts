import mongoose from "mongoose"
import { FurryPage } from "./FurryPage"

export interface SonicPage extends FurryPage {}

const schema = new mongoose.Schema<SonicPage>({
	pageId: Number,
	nextImageId: Number,
	totalImages: Number
})

export default mongoose.model<SonicPage>("SonicPage", schema)
