"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const GenUtils_1 = require("../../../utils/GenUtils");
const Tickets_1 = __importDefault(require("../../../schemas/Tickets"));
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("close_request")
    .setDescription("Issue a close request to for a ticket!")
    .addStringOption(opt => opt.setName("reason")
    .setDescription("Enter the reason for closing the ticket.")
    .setRequired(true))
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.AssistantModerator,
})
    .setExecutor(async (interaction) => {
    var _a;
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    const foundTicket = await Tickets_1.default.findOne({
        guildID: interaction.guild.id,
        channelID: (_a = interaction.channel) === null || _a === void 0 ? void 0 : _a.id,
        status: true,
    });
    if (!foundTicket) {
        interaction.reply((0, GenUtils_1.errorEmbed)("This channel is not a valid ticket."));
        return;
    }
    const length = await (0, GenUtils_1.getLengthFromString)("24h");
    const lengthNum = (Math.floor(Date.now() / 1000) + length[0]) || 0;
    await foundTicket.updateOne({
        autoClose: lengthNum,
        closeReason: interaction.options.getString("reason"),
    });
    const closeReqButtons = new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.ButtonBuilder()
        .setStyle(discord_js_1.ButtonStyle.Success)
        .setLabel("Close Ticket")
        .setCustomId("req_close")
        .setEmoji("☑"), new discord_js_1.ButtonBuilder()
        .setStyle(discord_js_1.ButtonStyle.Danger)
        .setLabel("Keep Open")
        .setCustomId("req_keep_open")
        .setEmoji("✖"));
    const closeReq = new discord_js_1.EmbedBuilder()
        .setAuthor({ name: "Close Ticket?", iconURL: interaction.guild.iconURL() || undefined })
        .setDescription(`Has this ticket been resolved? If so, please click \`CLOSE\`!
			
			**Reason:** ${interaction.options.getString("reason")}`)
        .setColor("Green")
        .setTimestamp()
        .setFooter({ text: "Ticket will close automatically in 24 hours." });
    interaction.reply({ content: `<@${foundTicket.creatorID}>`, embeds: [closeReq], components: [closeReqButtons.toJSON()] });
});
