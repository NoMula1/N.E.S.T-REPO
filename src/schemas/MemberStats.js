"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const schema = new mongoose_1.default.Schema({
    member: {
        type: String,
        required: true,
        unique: true
    },
    points: {
        type: Number,
        required: true
    },
    lastPointsAwarded: {
        type: Number,
        required: true
    },
    regular: Number,
    attachments: Number,
    replies: Number,
});
exports.default = mongoose_1.default.model("memberstatistics", schema);
