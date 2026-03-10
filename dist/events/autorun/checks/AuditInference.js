"use strict";
/**
 * AuditInference.ts
 *
 * Handles inferred case logging
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const Case_1 = __importDefault(require("../../../schemas/Case"));
const GenUtils_1 = require("../../../utils/GenUtils");
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
    name: discord_js_1.Events.GuildAuditLogEntryCreate,
    once: false,
    async execute(_, logEntry, guild) {
        const { action, extra: channel, executorId, targetId, changes, reason } = logEntry;
        // Ignore NEST actions
        if (!executorId || executorId === _.client.user.id)
            return;
        if (executorId === "1259957235862343801")
            return;
        if (!targetId)
            return;
        if (executorId === targetId)
            return;
        if (!LOG_TYPE_WHITELIST.includes(action))
            return;
        const batchedUpdateBlock = {
            target: targetId,
            batchedItems: []
        };
        switch (action) {
            case discord_js_1.AuditLogEvent.MemberUpdate: {
                // Requires extra processing
                for (const entryChange of changes) {
                    if (!CHANGE_KEY_WHITELIST.includes(entryChange.key))
                        continue;
                    batchedUpdateBlock.batchedItems.push({
                        updateType: "key",
                        higherAction: REVERSE_LOG_TYPE[action],
                        key: entryChange.key,
                        old: entryChange.old,
                        new: entryChange.new,
                        reason: reason
                    });
                }
                break;
            }
            default: {
                batchedUpdateBlock.batchedItems.push({
                    updateType: "base",
                    action: REVERSE_LOG_TYPE[action],
                    reason: reason
                });
                break;
            }
        }
        let caseDescriptionFinal = `\n\`\`\`[Auto-Inferred Action]\nSource: Audit Log`;
        for (const batchEntry of batchedUpdateBlock.batchedItems) {
            caseDescriptionFinal += '\n\n';
            if (batchEntry.updateType === "key") {
                caseDescriptionFinal += `Sub-Key Change [${batchEntry.higherAction} :: ${batchEntry.key}]\n\tOldValue: \`${batchEntry.old}\`\n\tNewValue: \`${batchEntry.new}\`\n\tReason: *${batchEntry.reason}* <END>`;
            }
            else if (batchEntry.updateType === "base") {
                caseDescriptionFinal += `Base Entry [${batchEntry.action}]\n\tReason: *${batchEntry.reason}* <END>`;
            }
        }
        caseDescriptionFinal += '\n\`\`\`';
        const caseNumber = await (0, GenUtils_1.incrimentCase)(guild);
        const absurdDuration = await (0, GenUtils_1.getLengthFromString)("30d");
        const newCase = new Case_1.default({
            guildID: guild.id,
            userID: targetId,
            modID: executorId,
            caseNumber: caseNumber,
            caseType: "MODERATION_INFER",
            reason: caseDescriptionFinal,
            duration: absurdDuration[1],
            durationUnix: (Math.floor(Date.now() / 1000) + absurdDuration[0]),
            active: true,
            dateIssued: Date.now()
        });
        newCase.save().catch((err) => {
            console.log(err);
        });
    }
};
