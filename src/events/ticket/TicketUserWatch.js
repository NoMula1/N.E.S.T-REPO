"use strict";
/**
 * AuditInference.ts
 *
 * Handles inferred case logging
 */
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
// Notice: to spare NEST resources & storage space in the DB, only __sensitive actions__ can be whitelisted, like bans or kicks. Insensitive actions like deleting messages should not be whitelisted.
// Whitelisted options also must contain a `targetId` for inferring purposes
const LOG_TYPE_WHITELIST = [
    discord_js_1.AuditLogEvent.MemberKick,
    discord_js_1.AuditLogEvent.MemberBanAdd,
    discord_js_1.AuditLogEvent.MemberBanRemove,
    discord_js_1.AuditLogEvent.MemberUpdate
];
const REVERSE_LOG_TYPE = {
    20: 'MEMBER_KICK',
    22: 'MEMBER_BAN_ADD',
    23: 'MEMBER_BAN_LIFT',
    24: 'MEMBER_UPDATE'
};
const CHANGE_KEY_WHITELIST = [
    "nick",
    "communication_disabled_until"
];
exports.default = {
    name: discord_js_1.Events.GuildMemberRemove,
    once: false,
    async execute(_, l) {
    }
};
