import mongoose from "mongoose"

export interface Post {
	guildID: string;
	userID: string;
	jobChannelId: string;
	messageId: string;
	postTemplateReference: string;
}

const schema = new mongoose.Schema<Post>({
	guildID: {
		type: String,
		required: true
	},
	userID: {
		type: String,
		required: true
	},
	jobChannelId: String,
	messageId: String,
	postTemplateReference: String,
},
	{
		timestamps: true
	})

export default mongoose.model<Post>("post", schema)