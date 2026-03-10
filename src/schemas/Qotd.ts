import mongoose from "mongoose"

export interface Question {
	question: string;
	userID: string;
}

const schema = new mongoose.Schema<Question>({
	question: {
		type: String,
		required: true,
	},
	userID: {
		type: String,
		required: true,
	},
})

export default mongoose.model<Question>("question", schema)
