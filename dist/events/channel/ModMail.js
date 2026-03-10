"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const ModMail_1 = __importDefault(require("../../schemas/ModMail"));
const GenUtils_1 = require("../../utils/GenUtils");
const logging_1 = require("../../utils/logging");
const channels_1 = __importStar(require("../../utils/channels"));
let mCount = 0;
async function editLast(channel, userId, edited) {
    const messages = await channel.messages.fetch({ limit: 3 });
    const lastMessage = messages.find(message => message.author.id === userId);
    if (lastMessage) {
        await lastMessage.edit({ components: [edited] });
    }
}
exports.default = {
    async onReady() {
        ModMail_1.default.deleteMany({}).catch(logging_1.Log.error);
    },
    async onMessageCreate(_, message) {
        if (message.channel.type === discord_js_1.ChannelType.DM && message.author.bot == false) {
            // This is unused. No point in guarding for this
            //const channel = message.client.channels.cache.get('1210690235696947260') as TextChannel;
            //if (!channel) {
            //	Log.error("Channel does not exist");
            //	return;
            //}
            await message.react('✅');
            const sureEmbed = new discord_js_1.EmbedBuilder()
                .setTitle("Are you sure you wish to send this message")
                .setDescription("Choose between the options below");
            const confirmRow = new discord_js_1.ActionRowBuilder()
                .setComponents(new discord_js_1.ButtonBuilder()
                .setCustomId('confirm')
                .setLabel("Yes")
                .setStyle(discord_js_1.ButtonStyle.Danger), new discord_js_1.ButtonBuilder()
                .setCustomId('deny')
                .setLabel("No")
                .setStyle(discord_js_1.ButtonStyle.Success));
            const newModMailUser = new ModMail_1.default({
                userID: message.author.id,
                messageID: message.id,
                channelID: message.channel.id,
                messageContent: message.content,
                author: message.author,
                authorTag: message.author.tag,
                authorDisplay: message.author.displayAvatarURL(),
                count: mCount++,
            });
            newModMailUser.save().catch((error) => {
                logging_1.Log.error("Failed to save ModMailUser: " + error);
            });
            await message.reply({ embeds: [sureEmbed], components: [confirmRow] });
        }
    },
    async onInteractionCreate(_, interaction) {
        if (!interaction.isButton() && !interaction.isModalSubmit()) {
            return;
        }
        if (!interaction.channel) {
            logging_1.Log.error("No channel found");
            return;
        }
        if (interaction.isButton()) {
            switch (interaction.customId) {
                case 'send_message': {
                    const modal = new discord_js_1.ModalBuilder()
                        .setTitle('Respond')
                        .setCustomId("modal_respond");
                    // future proofing :) - 02 (going to make this a bit better later)
                    const modalInputs = [
                        new discord_js_1.TextInputBuilder()
                            .setCustomId("modal_response")
                            .setLabel("Response")
                            .setRequired(true)
                            .setMaxLength(255)
                            .setStyle(discord_js_1.TextInputStyle.Paragraph)
                    ];
                    for (const inputs of modalInputs)
                        modal.addComponents(new discord_js_1.ActionRowBuilder().setComponents(inputs));
                    await interaction.showModal(modal.toJSON());
                    break;
                }
                case 'confirm':
                    {
                        try {
                            const find = await ModMail_1.default.findOne({ channelID: interaction.channelId }).catch((error) => {
                                (0, GenUtils_1.handleError)(error);
                                return;
                            });
                            const userID = await ModMail_1.default.findOne({ userID: interaction.user.id });
                            const messageCont = userID === null || userID === void 0 ? void 0 : userID.messageContent;
                            const author = userID === null || userID === void 0 ? void 0 : userID.author;
                            const authorTag = userID === null || userID === void 0 ? void 0 : userID.authorTag;
                            const authorDisplay = userID === null || userID === void 0 ? void 0 : userID.authorDisplay;
                            if (!userID || messageCont || author || authorTag || authorDisplay) {
                                console.log("error recieved error is: ");
                            } // how do I catch the error if there is an error? cant use .catch
                            if (!messageCont) {
                                return;
                            }
                            if (!author) {
                                return;
                            }
                            const embed = new discord_js_1.EmbedBuilder()
                                .setTitle('ModMail')
                                .setDescription(messageCont)
                                .setAuthor({ name: `${authorTag}`, iconURL: `${authorDisplay}` })
                                .setTimestamp()
                                .setFooter({ text: `${authorTag}` });
                            const row = new discord_js_1.ActionRowBuilder()
                                .addComponents(new discord_js_1.ButtonBuilder()
                                .setCustomId('send_message')
                                .setLabel('Send Message?')
                                .setStyle(discord_js_1.ButtonStyle.Primary)
                                .setEmoji('✉️'));
                            const sentEmbed = new discord_js_1.EmbedBuilder()
                                .setTitle("ModMail")
                                .setColor("Blurple")
                                .setDescription("Your message was sent");
                            const confirmed = new discord_js_1.ActionRowBuilder()
                                .setComponents(new discord_js_1.ButtonBuilder()
                                .setCustomId('confirm')
                                .setLabel("Yes")
                                .setStyle(discord_js_1.ButtonStyle.Danger)
                                .setDisabled(true), new discord_js_1.ButtonBuilder()
                                .setCustomId('deny')
                                .setLabel("No")
                                .setStyle(discord_js_1.ButtonStyle.Success)
                                .setDisabled(true));
                            if (!find || !find.channelID) {
                                logging_1.Log.error("No channel ID found for confirm action");
                                return;
                            }
                            //const channel = client.channels.cache.get('1212593742423527454') as TextChannel;
                            const channel = interaction.client.channels.cache.get((0, channels_1.default)(channels_1.Channel.MOD_MAIL));
                            editLast(interaction.client.channels.cache.get(find.channelID), (0, channels_1.default)(channels_1.Channel.MOD_MAIL), confirmed);
                            await interaction.reply({ embeds: [sentEmbed], ephemeral: true });
                            await channel.send({ embeds: [embed], components: [row] }).then(sentMessage => {
                                find.messageID = sentMessage.id;
                            }).catch((error) => {
                                logging_1.Log.error("Failed to send embed: " + error);
                            });
                        }
                        catch (error) {
                            (0, GenUtils_1.handleError)(error);
                        }
                    }
                    break;
                case 'deny': {
                    const findD = await ModMail_1.default.findOne({ channelID: interaction.channelId }).catch((error) => {
                        (0, GenUtils_1.handleError)(error);
                        return;
                    });
                    if (!(findD === null || findD === void 0 ? void 0 : findD.channelID)) {
                        return;
                    }
                    const denied = new discord_js_1.ActionRowBuilder()
                        .setComponents(new discord_js_1.ButtonBuilder()
                        .setCustomId('confirm')
                        .setLabel("Yes")
                        .setStyle(discord_js_1.ButtonStyle.Danger)
                        .setDisabled(true), new discord_js_1.ButtonBuilder()
                        .setCustomId('deny')
                        .setLabel("No")
                        .setStyle(discord_js_1.ButtonStyle.Success)
                        .setDisabled(true));
                    editLast(interaction.client.channels.cache.get(findD.channelID), '839572270753775676', denied);
                    interaction.reply({ content: "Thanks for contacting anyways," });
                    break;
                }
                default:
                    break;
            }
        }
        else if (interaction.isModalSubmit()) {
            const modalInteraction = interaction;
            if (!modalInteraction.channel) {
                logging_1.Log.error("no channel found for modal");
                return;
            }
            if (!interaction.message) {
                return;
            }
            const foundCase = await ModMail_1.default.findOneAndDelete({ count: mCount }).catch((error) => {
                (0, GenUtils_1.handleError)(error);
            });
            if (!foundCase) {
                return;
            }
            if (!foundCase || !foundCase.userID) {
                return;
            }
            const caseUser = await interaction.client.users.fetch(foundCase.userID);
            if (!caseUser) {
                interaction.reply({ content: "err user not found", ephemeral: true });
                return;
            }
            const description = modalInteraction.fields.getTextInputValue("modal_response");
            const embedDescription = new discord_js_1.EmbedBuilder()
                .setTitle("New Reply")
                .setColor('Yellow')
                .setAuthor({ name: `${modalInteraction.user.username}` })
                .setDescription(`${description}`);
            await caseUser.send({ embeds: [embedDescription] });
            await modalInteraction.reply({ content: "Reply submitted!", ephemeral: true });
        }
    }
};
