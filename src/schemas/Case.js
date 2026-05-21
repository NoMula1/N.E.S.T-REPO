"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const schema = new mongoose_1.default.Schema({
    guildID: String,
    userID: String,
    modID: String,
    caseNumber: Number,
    caseType: String,
    reason: String,
    duration: String,
    durationUnix: Number,
    active: Boolean,
    dateIssued: Number,
});
exports.default = mongoose_1.default.model("case", schema);
