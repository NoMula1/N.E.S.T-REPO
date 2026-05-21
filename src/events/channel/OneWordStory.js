"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
exports.default = {
    name: discord_js_1.Events.MessageCreate,
    once: false,
    async execute(_, message) {
        const channel = message.channel;
        if (!channel.isTextBased())
            return;
        if (channel.type !== discord_js_1.ChannelType.GuildText)
            return;
        if (channel.name !== "one-word-story")
            return;
    }
};
