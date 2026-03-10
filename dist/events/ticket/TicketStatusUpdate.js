"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketStatusCorellation = exports.ticketStatus = void 0;
exports.updateTicketStatus = updateTicketStatus;
exports.resolveTicketStatusEmbed = resolveTicketStatusEmbed;
const discord_js_1 = require("discord.js");
const Tickets_1 = __importDefault(require("../../schemas/Tickets"));
var ticketStatus;
(function (ticketStatus) {
    ticketStatus["NEUTRAL"] = "NEUTRAL";
    ticketStatus["SLOWER"] = "SLOWER";
    ticketStatus["SLOWEST"] = "SLOWEST";
})(ticketStatus || (exports.ticketStatus = ticketStatus = {}));
const ticketStatusTitles = {
    NEUTRAL: "Neutral Performance",
    SLOWER: "Degraded Performance",
    SLOWEST: "Severely Degraded Performance"
};
exports.ticketStatusCorellation = {
    NEUTRAL: "Tickets are being handled at a neutral rate, and your ticket should see a response soon.",
    SLOWER: "Tickets are being handled at a degraded rate, so your ticket may be less of a priority, and should be handled once other tickets have been resolved.",
    SLOWEST: "Tickets are being handled at a **severely** degraded rate, so your ticket may take a very long time before it sees a response."
};
async function updateTicketStatus() {
    const activeTickets = await Tickets_1.default.find({
        status: true
    });
    if (activeTickets.length <= 9)
        return ticketStatus.NEUTRAL;
    if (activeTickets.length >= 26)
        return ticketStatus.SLOWEST;
    return ticketStatus.SLOWER;
}
async function resolveTicketStatusEmbed(currentStatus) {
    // const currentStatus = await updateTicketStatus()
    let color;
    if (currentStatus === ticketStatus.NEUTRAL) {
        color = 0xA2E4B8;
    }
    else if (currentStatus === ticketStatus.SLOWER) {
        color = 0xff9913;
    }
    else {
        color = 0xFF6D6A;
    }
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(ticketStatusTitles[currentStatus])
        .setDescription(exports.ticketStatusCorellation[currentStatus])
        .setColor(color);
    return embed;
}
