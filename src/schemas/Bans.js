"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const schema = new mongoose_1.default.Schema({
    guildID: String,
    userID: String,
    target: {
        id: String,
        username: String
    },
    moderator: {
        id: String,
        username: String
    },
    guild: {
        id: String,
        name: String
    },
    reason: String,
    caseNumber: Number,
    endDate: Number,
    at: Date
});
exports.default = mongoose_1.default.model("ban", schema);
