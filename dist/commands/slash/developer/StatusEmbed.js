"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const TicketStatusUpdate_1 = require("../../../events/ticket/TicketStatusUpdate");
const TicketStatus_1 = __importDefault(require("../../../schemas/TicketStatus"));
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("sendticketstatus")
    .setDescription("Send the \"Ticket Status\" embed.")
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.Administrator,
})
    .addChannelOption(opt => opt
    .setName("channel")
    .setDescription("Input a channel to send the embed.")
    .setRequired(true))
    .setExecutor(async (interaction) => {
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    const channel = interaction.options.getChannel("channel");
    if (!channel || channel.type !== discord_js_1.ChannelType.GuildText) {
        interaction.reply({ content: "Invalid channel provided!" });
        return;
    }
    const webhook = await channel.createWebhook({ name: "Ticket System", avatar: interaction.guild.iconURL() || undefined });
    const status = await (0, TicketStatusUpdate_1.updateTicketStatus)();
    const ticketStatusEmbed = await (0, TicketStatusUpdate_1.resolveTicketStatusEmbed)(status);
    const message = await webhook.send({ embeds: [ticketStatusEmbed] }).catch(() => { });
    if (!message) {
        interaction.reply(`Failed`);
        return;
    }
    await TicketStatus_1.default.findOneAndDelete({
        guildId: message.guildId
    });
    const data = await TicketStatus_1.default.create({
        guildId: message.guildId,
        channelId: message.channelId,
        messageId: message.id,
        ticketStatus: status
    });
    interaction.reply({ content: "Embed sent!" });
});
