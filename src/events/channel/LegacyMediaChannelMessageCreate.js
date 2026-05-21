"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const LegacyMediaChannel_1 = require("../../utils/LegacyMediaChannel");
exports.default = {
    name: discord_js_1.Events.MessageCreate,
    once: false,
    async execute(_, message) {
        var _a, _b;
        if ((0, LegacyMediaChannel_1.isMediaChannel)(message.channel) && !(0, LegacyMediaChannel_1.isMediaMessage)(message)) {
            const hintDM = new discord_js_1.EmbedBuilder()
                .setAuthor({ name: `Non-media message sent in media channel`, iconURL: ((_a = message.guild) === null || _a === void 0 ? void 0 : _a.iconURL()) || undefined })
                .setDescription(`You sent a non-media message in <#${message.channelId}>.
				Use a chat channel instead.`)
                .setColor("Green");
            await ((_b = message.member) === null || _b === void 0 ? void 0 : _b.user.send({ embeds: [hintDM] }).catch((err) => { }));
            await message.delete();
        }
    }
};
