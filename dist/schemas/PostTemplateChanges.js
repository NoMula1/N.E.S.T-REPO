"use strict";
// A schema for tracking template approvals, rejections, etc.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const schema = new mongoose_1.default.Schema({
    marketModerator: String,
    userId: String,
    templateChannel: String,
    templateType: String,
    reason: String,
    templateCreatedAt: Date,
    templateChangedAt: Date,
    isActionUnique: Boolean
}, {
    timestamps: true
});
exports.default = mongoose_1.default.model("posttemplatechanges", schema);
