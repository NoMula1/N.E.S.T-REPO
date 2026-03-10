import mongoose from "mongoose"

/**
 * Schema Description
 * 
 * General use:
 * 	Used for Marketplace Staff to attach notes to members, which will show up in template approval messages.
 * Contains:
 * 	IDs of ownership and utility purposes, an `isInternal` field if NEST assigned the note, tags and attached templates.
 */
export interface UserMarketNoteType {
	userID: string,
	noteCreatorID: string,
	/** Whether NEST assigned this note */
	isInternal: boolean,
	saved: boolean,
	/** json-encoded string of relative tags */
	tags: string,
	/** json-encoded string of relative template IDs */
	attachedTemplates: string,
	description: string,
}

const schema = new mongoose.Schema<UserMarketNoteType>({
	userID: {
		type: String,
		required: true
	},
	noteCreatorID: {
		type: String,
		required: true
	},
	isInternal: Boolean,
	saved: Boolean,
	tags: {
		type: String,
		required: true
	},
	attachedTemplates: String,
	description: {
		type: String,
		required: false
	},
}, {
	timestamps: true
})

export default mongoose.model("usermarketnote", schema)