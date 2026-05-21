"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const schema = new mongoose_1.default.Schema({
    userID: String,
    messageID: String,
    messageContent: String,
    channelID: String,
    author: String,
    authorTag: String,
    authorDisplay: String,
    count: Number,
});
exports.default = mongoose_1.default.model("modmail", schema);
