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
const discord_js_1 = require("discord.js");
const fs_1 = require("fs");
const path_1 = __importStar(require("path"));
const RoleBans_1 = __importDefault(require("../../schemas/RoleBans"));
const logging_1 = require("../../utils/logging");
function addSpacesToEachLine(str) {
    return str.split("\n").map(line => "    " + line).join("\n");
}
function generateUniqueCharacters() {
    const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";
    let result = "";
    while (result.length < 8) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        if (!result.includes(characters[randomIndex])) {
            result += characters[randomIndex];
        }
    }
    return result;
}
async function downloadAttachment(url, path, name) {
    const response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    //console.log(`${path}/media/${name}`);
    (0, fs_1.writeFileSync)(`${path}/media/${name}`, buffer);
    return (0, path_1.resolve)(`${path}/media/${name}`);
}
const contentTypeFilter = [
    'image/png',
    'image/jpg',
    'image/jpeg',
    'image/JPG',
    'image/JPEG',
    'image/webp',
    'video/mp4',
    'video/mov',
    'video/webm',
];
exports.default = {
    name: discord_js_1.Events.MessageCreate,
    once: false,
    async execute(_, message) {
        var _a, _b, _c, _d;
        const foundBan = await RoleBans_1.default.find({
            guildID: (_a = message.guild) === null || _a === void 0 ? void 0 : _a.id,
            userID: message.author.id,
        });
        if (foundBan) {
            for (const file of foundBan) {
                if (!((_b = message.member) === null || _b === void 0 ? void 0 : _b.roles.cache.has(file.roleID))) {
                    (_c = message.member) === null || _c === void 0 ? void 0 : _c.roles.add(file.roleID).catch(() => { });
                }
            }
        }
        if (!(message.channel instanceof discord_js_1.TextChannel))
            return;
        if (message.channel.parentId !== ((_d = message.guild) === null || _d === void 0 ? void 0 : _d.channels.cache.find(c => c.name.toLowerCase() == "tickets" && c.type === discord_js_1.ChannelType.GuildCategory)).id)
            return;
        const ticketID = message.channel.id;
        const ticketPath = path_1.default.join(__dirname, "../..", "transcripts", `${ticketID}`);
        if (!(0, fs_1.existsSync)(ticketPath)) {
            try {
                (0, fs_1.mkdirSync)(ticketPath);
                logging_1.Log.warn(`Ticket transcript is missing. Will not be able to append message to it! ${message.author.tag} (${message.author.id}) at ${message.createdAt}`);
            }
            catch (_e) {
                return;
            }
        }
        try {
            (0, fs_1.appendFileSync)(`${ticketPath}/ticket_transcript.md`, `\n\nFrom [${message.author.tag}](https://www.discord.com/users/${message.author.id}) at \`${message.createdAt}\``);
            (0, fs_1.appendFileSync)(`${ticketPath}/ticket_transcript.txt`, `\n${message.author.tag} (${message.author.id}) at ${message.createdAt}:`);
            if (message.content) {
                const replaced = addSpacesToEachLine(message.content);
                (0, fs_1.appendFileSync)(`${ticketPath}/ticket_transcript.md`, `\n\n${replaced}`);
                (0, fs_1.appendFileSync)(`${ticketPath}/ticket_transcript.txt`, `\n\n${replaced}`);
            }
            if (message.attachments && message.attachments.size >= 1) {
                for (const attachment of Array.from(message.attachments.values())) {
                    const name = generateUniqueCharacters();
                    if (contentTypeFilter.find(x => x === attachment.contentType)) {
                        const p = await downloadAttachment(attachment.url, ticketPath, name + "." + attachment.contentType.split("/")[1]);
                        (0, fs_1.appendFileSync)(`${ticketPath}/ticket_transcript.md`, `\n\n![User uploaded file "${name}"](./media/${name + "." + attachment.contentType.split("/")[1]})`);
                        (0, fs_1.appendFileSync)(`${ticketPath}/ticket_transcript.txt`, `\n\n[IMAGE at "${name}"; you can find this image in the transcript thread, uploaded by NEST as an attachment.]`);
                    }
                }
            }
        }
        catch (e) {
            logging_1.Log.error('Unable to record transcript message' + e);
        }
    }
};
