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
exports.handleError = handleError;
exports.timeStringNow = timeStringNow;
exports.createNewGuildFile = createNewGuildFile;
exports.incrimentCase = incrimentCase;
exports.errorEmbed = errorEmbed;
exports.incrimentTicket = incrimentTicket;
exports.sendModLogs = sendModLogs;
exports.convertToMilliseconds = convertToMilliseconds;
exports.getLengthFromString = getLengthFromString;
exports.formatDate = formatDate;
exports.formatTime = formatTime;
exports.getMaxRAM = getMaxRAM;
exports.getUsedRAM = getUsedRAM;
exports.formatRAM = formatRAM;
const Sentry = __importStar(require("@sentry/node"));
const discord_js_1 = require("discord.js");
const logging_1 = require("./logging");
const config_1 = require("./config");
const Settings_1 = __importDefault(require("../schemas/Settings"));
const convert_1 = require("convert");
function handleError(err) {
    logging_1.Log.error("Uh oh! NEST has encountered an error.\n" + err.message + "\n" + err.stack);
    Sentry.captureException(err);
    if (!config_1.config.error_webhook_url) {
        logging_1.Log.warn("No error webhook URL was found! Could not send error embed.");
        return;
    }
    try {
        const webhook = new discord_js_1.WebhookClient({ url: config_1.config.error_webhook_url });
        const error = new discord_js_1.EmbedBuilder()
            .setTitle("NEST Error!")
            .setColor("Red")
            .addFields({ name: "Error:", value: `\`\`\`${err.message}\`\`\`` });
        webhook.send({ embeds: [error] }).catch(() => { });
    }
    catch (_a) {
        logging_1.Log.warn("Invalid error webhook URL, could not send error embed.");
    }
}
/**
 * Returns the current date an time in a string.
 * @returns {string}
 */
function timeStringNow() {
    const now = new Date();
    return `${now.getUTCDate().toString().padStart(2, "0")}-${(now.getUTCMonth() + 1).toString().padStart(2, "0")}-${now.getUTCFullYear().toString().padStart(4, "0")} ${now.getUTCHours().toString().padStart(2, "0")}:${now.getUTCMinutes().toString().padStart(2, "0")}:${now.getUTCSeconds().toString().padStart(2, "0")}:${now.getUTCMilliseconds().toString().padStart(3, "0")}`;
}
async function createNewGuildFile(guild) {
    const newSettings = new Settings_1.default({
        guildID: guild.id,
        modLogChannel: "None",
        caseCount: 1,
        ticketCount: 1,
        suggestionCount: 1,
        requirePostApproval: false,
    });
    newSettings.save().catch((err) => {
        handleError(err);
    });
}
async function incrimentCase(guild) {
    const settings = await Settings_1.default.findOne({
        guildID: guild.id
    });
    await (settings === null || settings === void 0 ? void 0 : settings.updateOne({
        $inc: { caseCount: 1 }
    }));
    return (settings === null || settings === void 0 ? void 0 : settings.caseCount) || 1;
}
function errorEmbed(string) {
    const errorEmbed = new discord_js_1.EmbedBuilder()
        .setColor("Red")
        .setDescription(`${config_1.config.failedEmoji} ${string}`);
    return { embeds: [errorEmbed], ephemeral: true };
}
async function incrimentTicket(guild) {
    const settings = await Settings_1.default.findOne({
        guildID: guild.id
    });
    await (settings === null || settings === void 0 ? void 0 : settings.updateOne({
        $inc: { ticketCount: 1 }
    }));
    return (settings === null || settings === void 0 ? void 0 : settings.ticketCount) || 1;
}
async function sendModLogs(options, embedDetails) {
    var _a, _b;
    const { guild } = options;
    const settings = await Settings_1.default.findOne({
        guildID: guild.id
    });
    if (!settings)
        return;
    let user = (_a = options.target) === null || _a === void 0 ? void 0 : _a.user;
    if (!user) {
        user = options.targetUser;
    }
    const mod = options.mod;
    if (options.targetUser) {
        user = options.targetUser;
    }
    let users = `:bust_in_silhouette: **Mod:** ${mod.user.username} (${mod.id})`;
    if (user) {
        users = users + `\n:busts_in_silhouette: **User:** ${user.username} (${user.id})`;
    }
    const action = `> ${embedDetails.actionInfo}`;
    let theChannel = ``;
    if (embedDetails.channel) {
        theChannel = `\n:briefcase: **Channel:** <#${embedDetails.channel.id}>`;
    }
    const modLogEmbed = new discord_js_1.EmbedBuilder()
        .setAuthor({ name: embedDetails.title, iconURL: mod.displayAvatarURL() || undefined })
        .setDescription(`${users} ${theChannel}\n<:clock:1071213725610151987> **Date:** <t:${Math.round(Date.now() / 1000)}:D>\n${action}`)
        .setColor("Green");
    const channel = guild === null || guild === void 0 ? void 0 : guild.channels.cache.find((c) => c.name.toLowerCase() === "logs");
    if (channel) {
        if ((_b = guild.members.me) === null || _b === void 0 ? void 0 : _b.permissionsIn(channel).has([discord_js_1.PermissionsBitField.Flags.SendMessages, discord_js_1.PermissionsBitField.Flags.EmbedLinks])) {
            if (options.attachments) {
                await guild.channels.cache.find((c) => c.id === (channel === null || channel === void 0 ? void 0 : channel.id)).send({ embeds: [modLogEmbed], files: options.attachments });
            }
            else {
                await guild.channels.cache.find((c) => c.id === (channel === null || channel === void 0 ? void 0 : channel.id)).send({ embeds: [modLogEmbed] });
            }
        }
    }
}
const timeRe = /([0-9]+)([a-zA-Z]+)/g;
const dateplusses = [
    "s",
    "m",
    "h",
    "d",
    "mo",
    "y"
];
function convertToMilliseconds(time) {
    const regex = /(\d+)h|(\d+)m|(\d+)s|(\d+)d/g;
    let matches;
    let minutes = 0;
    let hours = 0;
    let seconds = 0;
    let days = 0;
    while ((matches = regex.exec(time)) !== null) {
        if (matches[1]) {
            hours = Number(matches[1]);
        }
        else if (matches[2]) {
            minutes = Number(matches[2]);
        }
        else if (matches[3]) {
            seconds = Number(matches[3]);
        }
        else if (matches[4]) {
            days = Number(matches[4]);
        }
    }
    const milliseconds = (minutes * 60 + hours * 60 * 60 + seconds) * 1000 + days * 24 * 60 * 60 * 1000;
    return milliseconds;
}
async function getLengthFromString(date) {
    return new Promise(async (resolve, reject) => {
        const expiration = new Date();
        const t = date;
        if (t) {
            const converted = convertShortToLongTime(date);
            resolve([convertToMilliseconds(date) / 1000, converted]);
        }
        else {
            resolve([null, null]);
        }
    });
}
/**
 * Returns the current date an time in a string.
 * @param {string} string Input the string you'd like to test for time.
 * @returns {[number, string]}
 */
/*
export function getLengthFromString(string: string): [number, string] | [null, null] {
    try {
        let lengthString: string | null = string;
        if (Number(string)) lengthString = `${string}s`;
        let length = convertStringToTime(lengthString);
        if (!length) return [null, null];
        lengthString = convertShortToLongTime(lengthString);
        if (!lengthString) return [null, null];

        return [length, lengthString];
    } catch (err) {
        return [null, null];
    }
}
*/
function convertStringToTime(string) {
    let lengthNum = null;
    if (string.replace(/\d/g, "") == "m")
        string = string.replace(/\D/g, '').concat("min");
    try {
        lengthNum = (0, convert_1.convertMany)(string).to('s');
    }
    catch (err) {
        return null;
    }
    return lengthNum;
}
function convertShortToLongTime(shortTime) {
    const unitsMap = {
        y: 'year(s)',
        mo: 'month(s)',
        w: 'week(s)',
        d: 'day(s)',
        h: 'hour(s)',
        m: 'minute(s)',
        s: 'second(s)'
    };
    const timeUnits = shortTime.match(/\d+[ywdhms]|mo/g);
    if (!timeUnits) {
        return "";
    }
    const longTimes = timeUnits.map(timeUnit => {
        const value = parseInt(timeUnit.slice(0, -1), 10);
        const unit = timeUnit.slice(-1);
        const longUnit = unitsMap[unit];
        if (!longUnit) {
            throw new Error(`Invalid time unit: ${unit}`);
        }
        return `${value} ${longUnit}`;
    });
    return longTimes.join(', ');
}
/**
 * Returns the current date and time for user display.
 * @param date The date to format.
 */
function formatDate(date = new Date()) {
    return `${date.getUTCDate().toString().padStart(2, "0")}-${(date.getUTCMonth() + 1).toString().padStart(2, "0")}-${date.getUTCFullYear().toString().padStart(4, "0")} ${date.getUTCHours().toString().padStart(2, "0")}:${date.getUTCMinutes().toString().padStart(2, "0")}:${date.getUTCSeconds().toString().padStart(2, "0")}:${date.getUTCMilliseconds().toString().padStart(3, "0")}`;
}
/**
 * Formats the duration for user display.
 * @param ms The time in milliseconds.
 */
function formatTime(ms) {
    let seconds = ms / 1000;
    const days = Math.floor(seconds / 60 / 60 / 24);
    seconds = seconds - days * 60 * 60 * 24;
    const hours = Math.floor(seconds / 60 / 60);
    seconds = seconds - hours * 60 * 60;
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds - minutes * 60);
    return (days > 0 ? days + ' Days, ' : '') + (hours > 0 ? hours + ' hours, ' : '') + (minutes > 0 ? minutes + ' minutes, ' : '') + seconds + ' seconds';
}
const os_1 = __importDefault(require("os"));
function getMaxRAM() {
    const totalRam = os_1.default.totalmem(); // Total RAM in bytes
    const maxRamInMB = Math.round(totalRam / (1024 * 1024)); // Convert to MB
    return formatRAM(maxRamInMB);
}
function getUsedRAM() {
    const usedRamInMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    return formatRAM(usedRamInMB);
}
function formatRAM(ramInMB) {
    if (ramInMB >= 1024) {
        const ramInGB = ramInMB / 1024;
        return `${ramInGB.toFixed(2)} GB`;
    }
    else {
        return `${ramInMB} MB`;
    }
}
