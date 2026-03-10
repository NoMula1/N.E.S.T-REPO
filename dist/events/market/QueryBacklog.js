"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any */
const discord_js_1 = require("discord.js");
const PostButton_1 = require("./PostButton");
const PostTemplates_1 = __importDefault(require("../../schemas/PostTemplates"));
const Core_1 = require("../../Core");
const config_1 = require("../../utils/config");
const executingUsers = {};
exports.default = {
    name: discord_js_1.Events.InteractionCreate,
    once: false,
    async execute(_, i) {
        var _a, _b;
        if (i.isButton()) {
            switch (i.customId) {
                case "query_post":
                    {
                        if (!i.isButton())
                            return;
                        const embed = i.message.embeds[0];
                        const fields = embed.fields.map(f => f.value).join('\n');
                        // get the match
                        executingUsers[i.user.id] = fields;
                        const modal = new discord_js_1.ModalBuilder()
                            .setTitle('Respond')
                            .setCustomId("response")
                            .addComponents(new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.TextInputBuilder()
                            .setCustomId("query_id")
                            .setLabel("ID to query")
                            .setRequired(true)
                            .setMaxLength(3)
                            .setStyle(discord_js_1.TextInputStyle.Paragraph)));
                        await i.showModal(modal);
                    }
                    break;
                default:
                    return;
            }
        }
        else if (i.isModalSubmit() && i.guild) {
            switch (i.customId) {
                case "response":
                    {
                        await i.deferReply({ flags: "Ephemeral" });
                        const fields = executingUsers[i.user.id];
                        if (!fields)
                            return;
                        const modalInteraction = i;
                        const input = (_a = modalInteraction.fields.getField("query_id")) === null || _a === void 0 ? void 0 : _a.value;
                        if (!input)
                            return;
                        const id = parseInt(input);
                        if (isNaN(id))
                            return;
                        const m = fields.split('\n').find(e => {
                            const [eNumber] = e.split(':').map(s => s.trim());
                            return parseInt(eNumber) === id;
                        });
                        if (m) {
                            const ID = (_b = m.match(/\*\*([a-f0-9]+)\*\*/)) === null || _b === void 0 ? void 0 : _b[1];
                            if (!ID) {
                                delete executingUsers[i.user.id];
                                return await i.editReply(errorEmbed("Error! Could not resolve ID"));
                            }
                            const post = await PostTemplates_1.default.findOne({
                                _id: ID
                            });
                            if (!post) {
                                delete executingUsers[i.user.id];
                                return await i.editReply(errorEmbed("Error! Could not find Post"));
                            }
                            const user = await Core_1.client.users.fetch(post === null || post === void 0 ? void 0 : post.userID);
                            const embed = (0, PostButton_1.generateEmbed)(post, user, i.guild, true);
                            await i.editReply({
                                embeds: [(await embed).PostEmbed],
                                content: (await embed).PostMessage
                            });
                        }
                        else {
                            await i.editReply(errorEmbed("Error! Could not resolve ID"));
                        }
                        delete executingUsers[i.user.id];
                    }
                    break;
                default:
                    return;
            }
        }
    }
};
function errorEmbed(message) {
    const errorEmbed = new discord_js_1.EmbedBuilder()
        .setColor("Red")
        .setDescription(`${config_1.config.failedEmoji} ${message}`);
    return { embeds: [errorEmbed] };
}
