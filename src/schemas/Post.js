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
    jobChannelId: String,
    messageId: String,
    postTemplateReference: String,
}, {
    timestamps: true
});
exports.default = mongoose_1.default.model("post", schema);
