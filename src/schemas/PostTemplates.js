"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const schema = new mongoose_1.default.Schema({
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
});
exports.default = mongoose_1.default.model("postTemplate", schema);
