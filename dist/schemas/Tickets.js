"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const schema = new mongoose_1.default.Schema({
    guildID: String,
    creatorID: String,
    users: Array,
    channelID: String,
    claimedID: String,
    closeReason: String,
    status: Boolean,
    autoClose: Number,
});
exports.default = mongoose_1.default.model("ticket", schema);
