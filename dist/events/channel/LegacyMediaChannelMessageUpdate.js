"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const LegacyMediaChannel_1 = require("../../utils/LegacyMediaChannel");
exports.default = {
    name: discord_js_1.Events.MessageUpdate,
    once: false,
    async execute(_, _oldMessage, newMessage) {
        var _a, _b;
        if ((0, LegacyMediaChannel_1.isMediaChannel)(newMessage.channel) && !(0, LegacyMediaChannel_1.isMediaMessage)(newMessage)) {
            const hintDM = new discord_js_1.EmbedBuilder()
                .setAuthor({ name: `Media removed from media-only channel message`, iconURL: ((_a = newMessage.guild) === null || _a === void 0 ? void 0 : _a.iconURL()) || undefined })
                .setDescription(`You removed media from a message in <#${newMessage.channelId}>.
				Repost the media message or send it in a chat channel instead.`)
                .setColor("Green");
            await ((_b = newMessage.member) === null || _b === void 0 ? void 0 : _b.user.send({ embeds: [hintDM] }).catch((err) => { }));
            await newMessage.delete();
        }
    }
};
