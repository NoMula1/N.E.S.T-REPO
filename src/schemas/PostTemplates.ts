import mongoose from "mongoose"

export interface PostTemplateType {
	guildID: string;
	userID: string;
	jobType: string;
	talentHubLink: string;
	author: string;
	embedColor: string;
	description: string;
	bitwiseTags: bigint;
	payment: {
		robux: string;
		money: string;
		other: string;
	};
	thumbnail: string;
	image: string;
	footer: {
		text: string;
		icon: string;
	};
	approved: boolean;
	waitingForApproval: boolean;
	approvalMessageID: string;
	isQueueServed: boolean;
	queueServedTo: string | undefined;
	queueServedAt: Date;
	isSuspended: boolean;
	suspendedAt: Date;
	suspensionRenewCount: number;
	createdAt: Date;
	updatedAt: Date;
}

const schema = new mongoose.Schema<PostTemplateType>({
	guildID: {
		type: String,
		required: true
	},
	userID: {
		type: String,
		required: true
	},
	jobType: {
		type: String,
		required: true
	},
	talentHubLink: String,
	author: String,
	embedColor: String,
	description: String,
	bitwiseTags: BigInt,
	payment: {
		robux: String,
		money: String,
		other: String,
	},
	thumbnail: String,
	image: String,
	footer: {
		text: String,
		icon: String,
	},
	approved: {
		type: Boolean,
		required: true,
	},
	waitingForApproval: Boolean,
	approvalMessageID: String,
	isQueueServed: Boolean,
	queueServedTo: String,
	queueServedAt: Date,
	isSuspended: Boolean,
	suspendedAt: Date,
	suspensionRenewCount: Number
}, {
	timestamps: true
})

export default mongoose.model<PostTemplateType>("postTemplate", schema)