"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const schema = new mongoose_1.default.Schema({
    guildID: String,
    caseCount: Number,
    ticketCount: Number,
    suggestionCount: Number,
    requirePostApproval: Boolean,
    postApprovalLottery: {
        type: Number,
        min: 0,
        max: 1
    },
    forHireChannel: String,
    hiringChannel: String,
    sellingChannel: String,
    restartInvokeMessageId: String,
    banImageLink: String,
    bannedImagesThreshold: {
        type: Number,
        min: 0,
        max: 1
    }
});
exports.default = mongoose_1.default.model("setting", schema);
