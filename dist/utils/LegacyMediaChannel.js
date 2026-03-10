"use strict";
// TODO: Export a list of media channel ids and a utility to detect embeddable media in a message
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMediaChannel = isMediaChannel;
exports.isMediaMessage = isMediaMessage;
const discord_js_1 = require("discord.js");
function isMediaChannel(channel) {
    return channel instanceof discord_js_1.TextChannel && channel.name.startsWith('cool-');
}
function isMediaMessage(message) {
    // Check for attachments or embeddable content
    return (Array.from(message.attachments).length > 0) || message.embeds.length > 0;
}
