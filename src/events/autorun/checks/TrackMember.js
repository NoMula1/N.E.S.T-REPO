"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const MemberStats_1 = __importDefault(require("../../../schemas/MemberStats"));
const logging_1 = require("../../../utils/logging");
const COOLDOWN = 5 * 60 * 1000; // 5 minutes (milliseconds)
async function createStats(member, now) {
    await MemberStats_1.default.create({
        member: member.id,
        points: 1,
        lastPointsAwarded: now,
        regular: 1,
        attachments: 0,
        replies: 0
    });
    logging_1.Log.info(`Created statistics for member: ${member.displayName}`);
}
exports.default = {
    name: discord_js_1.Events.MessageCreate,
    once: false,
    async execute(_, message) {
        var _a, _b, _c, _d, _e;
        if (!message.member)
            return;
        if (message.author.bot)
            return;
        const now = Date.now();
        const stats = await MemberStats_1.default.findOne({ member: message.member.id });
        if (!stats) {
            await createStats(message.member, now);
        }
        else if ((now - stats.lastPointsAwarded) > COOLDOWN) {
            //Log.info(`Awarded points to member: ${message.member.displayName}`);
            await stats.updateOne({
                points: stats.points + 1,
                lastPointsAwarded: now,
                regular: ((_a = stats.regular) !== null && _a !== void 0 ? _a : 0) + 1,
                attachments: (message.attachments.size >= 1) ? (((_b = stats.attachments) !== null && _b !== void 0 ? _b : 0) + 1) : ((_c = stats.attachments) !== null && _c !== void 0 ? _c : 0),
                replies: (message.reference) ? (((_d = stats.replies) !== null && _d !== void 0 ? _d : 0) + 1) : ((_e = stats.attachments) !== null && _e !== void 0 ? _e : 0)
            });
        }
    }
};
