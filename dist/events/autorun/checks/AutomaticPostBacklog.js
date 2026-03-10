"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable import/no-named-as-default */
/* eslint-disable stylistic/semi */
const Core_1 = require("../../../Core");
const FastFlag_1 = __importDefault(require("../../../schemas/FastFlag"));
const PostTemplates_1 = __importDefault(require("../../../schemas/PostTemplates"));
const discord_js_1 = require("discord.js");
const logging_1 = require("../../../utils/logging");
async function CheckPosts() {
    const flag = await FastFlag_1.default.findOne({ refName: "DoAutoApprovalForPostCreationBacklog" });
    if (flag === null || flag === void 0 ? void 0 : flag.enabled) {
        await PostTemplates_1.default.find({ approved: false, jobType: { $ne: "SELLING" } }).then(async (posts) => {
            if (posts.length < 79)
                return;
            posts.forEach(async (post) => {
                await post.updateOne({ approved: true });
            });
            const channel = Core_1.client.channels.cache.find((c) => c.type === discord_js_1.ChannelType.GuildText && c.name.toLowerCase().includes("market-chat"));
            const embed = new discord_js_1.EmbedBuilder()
                .setDescription(`The post backlog limit has been reached, automatically approved all non-selling posts`)
                .setColor(discord_js_1.Colors.DarkAqua);
            const p = posts.map((p, i) => `${i + 1}: **${p._id}**`);
            for (let i = 0; i < p.length; i += 20) {
                const chunk = p.slice(i, i + 20);
                embed.addFields({
                    name: `Approved Posts ${Math.floor(i / 20) + 1}`,
                    value: chunk.join('\n')
                });
            }
            const actionrow = new discord_js_1.ActionRowBuilder()
                .addComponents([
                new discord_js_1.ButtonBuilder()
                    .setCustomId("query_post")
                    .setLabel("Get Post From ID")
                    .setStyle(discord_js_1.ButtonStyle.Success)
            ]);
            await channel.send({
                embeds: [embed],
                components: [actionrow.toJSON()]
            }).catch(err => logging_1.Log.error("AutomaticPostBacklog " + err));
        });
    }
}
setInterval(CheckPosts, 80 * 1000);
