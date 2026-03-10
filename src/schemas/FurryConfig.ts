import mongoose from "mongoose"

export interface FurryConfig {
	safeFilter: string;
	suggestiveFilter: string;
	explicitFilter: string;
}

const schema = new mongoose.Schema<FurryConfig>({
	safeFilter: String,
	suggestiveFilter: String,
	explicitFilter: String,
})

export default mongoose.model<FurryConfig>("furryConfig", schema)