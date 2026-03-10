// A schema for tracking template approvals, rejections, etc.

import mongoose from "mongoose"

export interface PostTemplateChanges {
	marketModerator: string;
	userId: string;
	templateChannel: string;
	templateType: string;
	reason: string;
	templateCreatedAt: Date;
	templateChangedAt: Date;
	/** Determines if this was the first action taken on the message ID */
	isActionUnique: boolean;
}

const schema = new mongoose.Schema<PostTemplateChanges>({
	marketModerator: String,
	userId: String,
	templateChannel: String,
	templateType: String,
	reason: String,
	templateCreatedAt: Date,
	templateChangedAt: Date,
	isActionUnique: Boolean
}, {
	timestamps: true
})

export default mongoose.model<PostTemplateChanges>("posttemplatechanges", schema)