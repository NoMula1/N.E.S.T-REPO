"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkTickets = checkTickets;
const discord_js_1 = require("discord.js");
const Tickets_1 = __importDefault(require("../../schemas/Tickets"));
const GenUtils_1 = require("../../utils/GenUtils");
const config_1 = require("../../utils/config");
const CoreClient_1 = __importDefault(require("../../bootstrap/CoreClient"));
async function checkTickets() {
    const tickets = await Tickets_1.default.find({
        autoClose: { $lt: Date.now() / 1000 },
        status: true
    });
    if (!tickets || tickets.length <= 0)
        return;
    tickets.forEach(async (singleTicket) => {
        if (singleTicket.autoClose == 0)
            return;
        await singleTicket.updateOne({
            status: false,
            closeReason: "Auto Close: Failure to respond to close request."
        });
        const guild = await CoreClient_1.default.instance.guilds.fetch(singleTicket.guildID);
        if (!guild) {
            await singleTicket.deleteOne();
            return;
        }
        const ticketChannel = await guild.channels.fetch(singleTicket.channelID);
        if ((ticketChannel === null || ticketChannel === void 0 ? void 0 : ticketChannel.type) !== discord_js_1.ChannelType.GuildText)
            return;
        if (!ticketChannel) {
            await singleTicket.deleteOne();
            return;
        }
        const member = await guild.members.fetch(singleTicket.creatorID);
        const ticketRowReq = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId("close_ticket")
            .setStyle(discord_js_1.ButtonStyle.Danger)
            .setLabel("Close Ticket")
            .setDisabled(true)
            .setEmoji("✖"), new discord_js_1.ButtonBuilder()
            .setCustomId("log_transcript")
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setLabel("Log Transcript")
            .setEmoji("📰"));
        const ticketClosed = new discord_js_1.EmbedBuilder()
            .setAuthor({ name: `Ticket Closed - ${member.user.username}`, iconURL: member.user.displayAvatarURL() || undefined })
            .setDescription(`Ticket has been closed. The ticket creator, and any added users have been removed and can no longer view the ticket.
						**Reason:** Auto Close: Failure to respond to close request.
						
						Click \`Log Transcript\` to log the transcript.`)
            .setColor("Green")
            .setTimestamp();
        const ticketClosedDM = new discord_js_1.EmbedBuilder()
            .setAuthor({ name: "Ticket Closed", iconURL: guild.iconURL() || undefined })
            .setDescription(`Ticket \`#${ticketChannel.name.split('-')[1]}\` has been closed!
						
						${config_1.config.bulletpointEmoji} **Reason:** Auto Close: Failure to respond to close request.`)
            .setColor("Green")
            .setTimestamp();
        ticketChannel.send({ embeds: [ticketClosed], components: [ticketRowReq] });
        await ticketChannel.edit({
            name: `closed-${ticketChannel.name.split('-')[1]}`
        }).catch(async (err) => {
            (0, GenUtils_1.handleError)(err);
            return;
        });
        await ticketChannel.permissionOverwrites.edit(singleTicket.creatorID, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false });
        const creator = CoreClient_1.default.instance.users.cache.get(singleTicket.creatorID);
        if (creator) {
            creator.send({ embeds: [ticketClosedDM] }).catch(() => { });
        }
        for (const user of singleTicket.users) {
            await ticketChannel.permissionOverwrites.edit(user, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false });
            const foundUser = CoreClient_1.default.instance.users.cache.get(user);
            if (!foundUser)
                return;
            await foundUser.send({ embeds: [ticketClosedDM] }).catch(() => { });
        }
    });
}
setInterval(checkTickets, 10 * 1000);
