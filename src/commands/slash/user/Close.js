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
    .setName("close")
    .setDescription("Close the current ticket.")
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.None,
})
    .setExecutor(async (interaction) => {
    var _a, _b;
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
    if (interaction.user.id !== foundTicket.creatorID) {
        if (((_b = interaction.member.guild.roles.cache.find((r) => r.name.toLowerCase() === "assistant moderator")) === null || _b === void 0 ? void 0 : _b.position) > interaction.member.guild.roles.highest.position && interaction.user.id !== foundTicket.creatorID) {
            interaction.reply((0, GenUtils_1.errorEmbed)("You do not have permission to close this ticket."));
            return;
        }
    }
    const postForm = new discord_js_1.ModalBuilder()
        .setCustomId("modal_close_reason")
        .setTitle("Enter a Reason");
    const postInputs = [
        new discord_js_1.TextInputBuilder()
            .setCustomId('close_reason')
            .setLabel("Reason")
            .setPlaceholder("Ticket resolved.")
            .setRequired(true)
            .setMaxLength(250)
            .setStyle(discord_js_1.TextInputStyle.Paragraph),
    ];
    for (const input of postInputs)
        postForm.addComponents(new discord_js_1.ActionRowBuilder().setComponents(input));
    await interaction.showModal(postForm);
});
