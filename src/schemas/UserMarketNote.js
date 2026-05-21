"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const schema = new mongoose_1.default.Schema({
    userID: {
        type: String,
        required: true
    },
    noteCreatorID: {
        type: String,
        required: true
    },
    isInternal: Boolean,
    saved: Boolean,
    tags: {
        type: String,
        required: true
    },
    attachedTemplates: String,
    description: {
        type: String,
        required: false
    },
}, {
    timestamps: true
});
exports.default = mongoose_1.default.model("usermarketnote", schema);
