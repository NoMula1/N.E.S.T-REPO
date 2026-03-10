"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.validateConfig = validateConfig;
const dotenv_1 = __importDefault(require("dotenv"));
const logging_1 = require("./logging");
const GlobalScope_1 = require("../bootstrap/GlobalScope");
const node_fs_1 = require("node:fs");
let configFile = {};
try {
    configFile = JSON.parse((0, node_fs_1.readFileSync)("./config.json", "utf8"));
    console.log("✅ Config loaded:", JSON.stringify(configFile, null, 2));
}
catch (err) {
    console.log("config.json not found, skipping. " + err); // fixme: Log complains timeStringNow does not exist
}
dotenv_1.default.config();
exports.config = {
    // Shared
    successEmoji: ((_b = (_a = configFile.successEmoji) !== null && _a !== void 0 ? _a : process.env.SUCCESS_EMOJI) !== null && _b !== void 0 ? _b : "✅"),
    failedEmoji: ((_d = (_c = configFile.failedEmoji) !== null && _c !== void 0 ? _c : process.env.FAILED_EMOJI) !== null && _d !== void 0 ? _d : "❌"),
    arrowEmoji: ((_f = (_e = configFile.arrowEmoji) !== null && _e !== void 0 ? _e : process.env.ARROW_EMOJI) !== null && _f !== void 0 ? _f : "➡️"),
    bulletpointEmoji: ((_h = (_g = configFile.bulletpointEmoji) !== null && _g !== void 0 ? _g : process.env.BULLETPOINT_EMOJI) !== null && _h !== void 0 ? _h : "•"),
    loadingEmoji: ((_k = (_j = configFile.loadingEmoji) !== null && _j !== void 0 ? _j : process.env.LOADING_EMOJI) !== null && _k !== void 0 ? _k : "↻"),
    warnEmoji: ((_m = (_l = configFile.warnEmoji) !== null && _l !== void 0 ? _l : process.env.WARN_EMOJI) !== null && _m !== void 0 ? _m : "⚠️"),
    devs: (configFile.devs || ["1149913737558499358"]),
    mongo_uri: process.env.MONGO_URI,
    error_webhook_url: process.env.ERROR_WEBHOOK_URL,
    // Default
    clientID: ((_o = configFile.clientID) !== null && _o !== void 0 ? _o : process.env.CLIENT_ID),
    token: process.env.TOKEN,
    // Admin
    clientIDAdmin: ((_p = configFile.clientIDAdmin) !== null && _p !== void 0 ? _p : process.env.CLIENT_ID_ADMIN),
    tokenAdmin: process.env.TOKEN_ADMIN,
};
async function validateConfig(scope) {
    switch (scope) {
        case GlobalScope_1.Scope.Admin:
            if (!exports.config.clientIDAdmin) {
                logging_1.Log.error("You are missing the \"CLIENT_ID_ADMIN\" argument in config.json. Slash commands will not work.");
            }
            if (!exports.config.tokenAdmin) {
                logging_1.Log.warn("You are missing the \"TOKEN_ADMIN\" environment variable! Starting NEST Admin will not work correctly.");
            }
            break;
        default:
            if (!exports.config.clientID) {
                logging_1.Log.error("You are missing the \"CLIENT_ID\" argument in config.json. Slash commands will not work.");
            }
            if (!exports.config.token) {
                logging_1.Log.error("You are missing the \"TOKEN\" evironment variable! Make sure you have a .env file with the token in it.");
            }
            break;
    }
    if (!exports.config.successEmoji) {
        logging_1.Log.warn("You are missing the \"successEmoji\" argument in config.json. Some emojis may not work.");
    }
    if (!exports.config.failedEmoji) {
        logging_1.Log.warn("You are missing the \"failedEmoji\" argument in config.json. Some emojis may not work.");
    }
    if (!exports.config.arrowEmoji) {
        logging_1.Log.warn("You are missing the \"arrowEmoji\" argument in config.json. Some emojis may not work.");
    }
    if (!exports.config.bulletpointEmoji) {
        logging_1.Log.warn("You are missing the \"bulletpointEmoji\" argument in config.json. Some emojis may not work.");
    }
    if (!exports.config.loadingEmoji) {
        logging_1.Log.warn("You are missing the \"loadingEmoji\" argument in config.json. Some emojis may not work.");
    }
    if (!exports.config.warnEmoji) {
        logging_1.Log.warn("You are missing the \"warnEmoji\" argument in config.json. Some emojis may not work.");
    }
    if (!exports.config.devs) {
        logging_1.Log.warn("You are missing the \"devs\" array argument in config.json. PermissionLevel.Developer will not function.");
    }
    if (!exports.config.mongo_uri) {
        logging_1.Log.error("You are missing the \"MONGO_URI\" evironment variable! Make sure you have a .env file with the mongo uri in it.");
    }
    if (!exports.config.error_webhook_url) {
        logging_1.Log.error("You are missing the \"ERROR_WEBHOOK_URL\" evironment variable! Error handling will not function without.");
    }
}
