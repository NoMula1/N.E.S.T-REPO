"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const PostTemplates_1 = __importDefault(require("../../schemas/PostTemplates"));
exports.default = {
    name: discord_js_1.Events.MessageDelete,
    once: false,
    async execute(_, message) {
        if (message.channel.type !== discord_js_1.ChannelType.GuildText)
            return;
        if (message.channel.name.toLowerCase() !== "template-approvals")
            return;
        const template = await PostTemplates_1.default.findOne({
            approvalMessageID: message.id,
        });
        if (!template)
            return;
        await template.updateOne({
            approvalMessageID: "",
            waitingForApproval: false
        });
    }
};
