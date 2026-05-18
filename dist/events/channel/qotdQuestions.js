"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const croner_1 = require("croner");
const logging_1 = require("../../utils/logging");
const discord_js_1 = require("discord.js");
const GuildConfigCache_1 = require("../../utils/GuildConfigCache");
const Qotd_1 = __importDefault(require("../../schemas/Qotd"));
exports.default = {
    name: discord_js_1.Events.ClientReady,
    once: false,
    async execute(_, client) {
        // *(minutes) *(hours) *(day of the month) *(month of the year) *(day of the week)
        (0, croner_1.Cron)('00 12 * * *', async () => {
            var _a, _b, _c, _d, _e;
            const mostRecentQuestion = await Qotd_1.default.findOne().sort({ createdAt: -1 });
            if (!mostRecentQuestion) {
                logging_1.Log.error("Cant find any questions inside of the DB");
                return;
            }
            const user = client.users.cache.get(mostRecentQuestion.userID);
            // Post to every linked guild that has QOTD enabled + a qotd channel configured
            for (const [guildId] of client.guilds.cache) {
                try {
                    const config = await (0, GuildConfigCache_1.getGuildConfig)(guildId);
                    const channelId = (_a = config === null || config === void 0 ? void 0 : config.channels) === null || _a === void 0 ? void 0 : _a.qotd;
                    if (!((_b = config === null || config === void 0 ? void 0 : config.features) === null || _b === void 0 ? void 0 : _b.qotd) || !channelId || !/^\d{17,20}$/.test(channelId))
                        continue;
                    let channel = client.channels.cache.get(channelId);
                    if (!channel) {
                        channel = (_c = await client.channels.fetch(channelId).catch(() => null)) !== null && _c !== void 0 ? _c : undefined;
                    }
                    if (!channel) {
                        logging_1.Log.error(`[${guildId}] Failed to fetch QOTD channel ${channelId}`);
                        continue;
                    }
                    const webhook = await channel.createWebhook({
                        name: (_d = user === null || user === void 0 ? void 0 : user.displayName) !== null && _d !== void 0 ? _d : 'NEST',
                        avatar: (_e = user === null || user === void 0 ? void 0 : user.displayAvatarURL()) !== null && _e !== void 0 ? _e : undefined,
                    });
                    const sent = await webhook.send({ content: mostRecentQuestion.question });
                    await sent.startThread({
                        name: `${mostRecentQuestion.question.slice(0, 80)} (${new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })})`,
                        autoArchiveDuration: 60,
                    }).catch((err) => logging_1.Log.error(`[${guildId}] Failed to start QOTD thread: ${err}`));
                    await webhook.delete().catch(() => { });
                }
                catch (err) {
                    logging_1.Log.error(`[${guildId}] QOTD error: ${err}`);
                }
            }
            // Delete question after all guilds have received it
            await Qotd_1.default.findByIdAndDelete(mostRecentQuestion._id).catch((err) => logging_1.Log.error(`Failed to delete QOTD from DB: ${err}`));
        });
    }
};
