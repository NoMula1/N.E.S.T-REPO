"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const croner_1 = require("croner");
const logging_1 = require("../../utils/logging");
const discord_js_1 = require("discord.js");
const channels_1 = __importStar(require("../../utils/channels"));
const Qotd_1 = __importDefault(require("../../schemas/Qotd"));
exports.default = {
    name: discord_js_1.Events.ClientReady,
    once: false,
    async execute(_, client) {
        const channelId = (0, channels_1.default)(channels_1.Channel.QOTD);
        let channel = client.channels.cache.get(channelId);
        if (!channel) {
            try {
                channel = await client.channels.fetch(channelId);
            }
            catch (error) {
                logging_1.Log.error(`Failed to fetch QOTD channel: ${error}`);
                return;
            }
        }
        // *(minutes) *(hours) *(day of the month) *(month of the year) *(day of the week)
        (0, croner_1.Cron)('00 12 * * *', async () => {
            const mostRecentQuestion = await Qotd_1.default.findOne().sort({ createdAt: -1 });
            if (!mostRecentQuestion) {
                logging_1.Log.error("Cant find any questions inside of the DB");
                return;
            }
            const user = client.users.cache.get(mostRecentQuestion.userID);
            const roleID = '1467625494768779447';
            const webhook = await channel.createWebhook({ name: `${user === null || user === void 0 ? void 0 : user.displayName}`, avatar: `${user === null || user === void 0 ? void 0 : user.displayAvatarURL()}` });
            webhook.send({ content: ` <@&${roleID}> ${mostRecentQuestion.question}`, allowedMentions: { roles: [roleID] } }).then(async (message) => {
                await message.startThread({
                    name: `${mostRecentQuestion.question} (${new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })})`,
                    autoArchiveDuration: 60
                });
                try {
                    await Qotd_1.default.findByIdAndDelete(mostRecentQuestion._id);
                }
                catch (err) {
                    logging_1.Log.error(`Failed to delete question from the DB: ${err}`);
                }
                webhook.delete();
            });
        });
    }
};
