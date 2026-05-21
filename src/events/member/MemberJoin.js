"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const RoleBans_1 = __importDefault(require("../../schemas/RoleBans"));
const PendingDeletion_1 = __importDefault(require("../../schemas/PendingDeletion"));
const Tickets_1 = __importDefault(require("../../schemas/Tickets"));
exports.default = {
    name: discord_js_1.Events.GuildMemberAdd,
    once: false,
    async execute(_, member) {
        var _a, _b;
        // Remove deletion pending
        const foundDeletionPending = await PendingDeletion_1.default.findOne({
            userID: member.id
        });
        if (foundDeletionPending) {
            await PendingDeletion_1.default.deleteOne({
                userID: member.id
            });
        }
        const foundBan = await RoleBans_1.default.find({
            guildID: (_a = member.guild) === null || _a === void 0 ? void 0 : _a.id,
            userID: member.id,
        });
        if (foundBan) {
            for (const file of foundBan) {
                if (!(member === null || member === void 0 ? void 0 : member.roles.cache.has(file.roleID))) {
                    member === null || member === void 0 ? void 0 : member.roles.add(file.roleID).catch(() => { });
                }
            }
        }
        const tickets = await Tickets_1.default.findOne({ users: member.user.id });
        if (tickets && tickets.status === true) {
            const channel = tickets.channelID ? (_b = member.guild) === null || _b === void 0 ? void 0 : _b.channels.cache.get(tickets.channelID) : null;
            if (channel) {
                await channel.edit({
                    permissionOverwrites: [
                        {
                            id: member.id,
                            allow: [discord_js_1.PermissionsBitField.Flags.ViewChannel, discord_js_1.PermissionsBitField.Flags.SendMessages, discord_js_1.PermissionsBitField.Flags.ReadMessageHistory],
                        }
                    ]
                });
            }
        }
    }
};
