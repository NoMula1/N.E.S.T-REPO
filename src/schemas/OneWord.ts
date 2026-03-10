import mongoose from "mongoose"

/** one word per user channel storage */
export interface OneWord {
	fragmentId: number;
	fragmentContent: string;
}

const schema = new mongoose.Schema<OneWord>({
	fragmentId: Number,
	fragmentContent: String,
}, {
	timestamps: true
})

export default mongoose.model<OneWord>("oneword", schema)