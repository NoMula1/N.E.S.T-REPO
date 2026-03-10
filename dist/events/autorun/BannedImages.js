"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const path_1 = __importDefault(require("path"));
const promises_1 = require("fs/promises");
const logging_1 = require("../../utils/logging");
const image_equal_1 = __importDefault(require("image-equal"));
const Settings_1 = __importDefault(require("../../schemas/Settings"));
const GlobalScope_1 = require("../../bootstrap/GlobalScope");
const bannedDir = path_1.default.join(__dirname, "..", "..", "content", "banned_images");
let logsWarned = false;
function isImage(attachment) {
    var _a;
    return ((_a = attachment.contentType) === null || _a === void 0 ? void 0 : _a.startsWith("image/")) === true;
}
async function isImageBanned(url, threshold) {
    return [false]; //FIXME: this is broken and was pushed to prod
    for (const bannedFilename of await (0, promises_1.readdir)(bannedDir)) {
        const bannedImage = await (0, promises_1.readFile)(path_1.default.join(bannedDir, bannedFilename));
        if ((0, image_equal_1.default)(bannedImage, url, threshold)) {
            // fixme: imagesEqual is not providing the amount, need to fix
            logging_1.Log.debug(`Image ${url} matches banned image: ${bannedFilename}`); //  (by ${diff.amount*100.0}%)
            return [true, 0, url, bannedFilename];
        }
    }
    return [false];
}
exports.default = {
    name: discord_js_1.Events.MessageCreate,
    scope: GlobalScope_1.Scope.Admin,
    once: false,
    async execute(_, message) {
        var _a, _b, _c, _d, _e;
        try {
            // Staff are immune from image bans
            if (((_c = (_b = (_a = message.member) === null || _a === void 0 ? void 0 : _a.roles) === null || _b === void 0 ? void 0 : _b.cache) === null || _c === void 0 ? void 0 : _c.find((r) => { r.name.toLowerCase() === "staff"; })) !== undefined)
                return;
            const logsChannel = (_d = message === null || message === void 0 ? void 0 : message.guild) === null || _d === void 0 ? void 0 : _d.channels.cache.find((c) => c.name.toLowerCase() === "logs");
            if (!logsChannel) {
                if (!logsWarned) {
                    logging_1.Log.warn("Unable to find cached logs channel. Image Bans will not apply.");
                    logsWarned = true;
                }
                return;
            }
            const bannedThreshold = ((_e = (await Settings_1.default.findOne({
                guildID: message.guildId
            }))) === null || _e === void 0 ? void 0 : _e.bannedImagesThreshold) || 0.6;
            let bannedResult = [false];
            for (const attachment of message.attachments.values()) {
                if (!isImage(attachment))
                    continue;
                bannedResult = await isImageBanned(attachment.url, bannedThreshold);
                if (bannedResult[0])
                    break;
            }
            if (bannedResult[0]) {
                const logEmbed = new discord_js_1.EmbedBuilder()
                    .setAuthor({ name: "Image Banned" })
                    .setDescription(`**Banned sample:** ${bannedResult[3]}`) // \n**Matched by:** ${bannedResult[1]*100.0}%
                    .setColor("Green")
                    .setImage("attachment://" + path_1.default.basename(new URL(bannedResult[2]).pathname));
                await logsChannel.send({ embeds: [logEmbed], files: [bannedResult[2]] });
                await message.delete();
            }
        }
        catch (e) {
            logging_1.Log.error(`Unable to check if attached images are banned: ${e}`);
        }
    }
};
