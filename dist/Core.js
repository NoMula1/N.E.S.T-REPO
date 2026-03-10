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
exports.client = void 0;
const GenUtils_1 = require("./utils/GenUtils");
process.on('unhandledRejection', (err) => (0, GenUtils_1.handleError)(err));
process.on('uncaughtException', (err) => (0, GenUtils_1.handleError)(err));
// Test commit - verifying git setup
const discord_js_1 = require("discord.js");
const logging_1 = require("./utils/logging");
const config_1 = require("./utils/config");
const InitializeModules_1 = require("./utils/InitializeModules");
const HandleFunnyMutes_1 = require("./utils/HandleFunnyMutes");
const CoreClient_1 = __importDefault(require("./bootstrap/CoreClient"));
const Mongoose_1 = __importDefault(require("./bootstrap/Mongoose"));
const GlobalScope_1 = require("./bootstrap/GlobalScope");
exports.client = new CoreClient_1.default(config_1.config.clientID, {
    intents: [
        discord_js_1.GatewayIntentBits.DirectMessages,
        discord_js_1.GatewayIntentBits.GuildModeration,
        discord_js_1.GatewayIntentBits.GuildPresences,
        discord_js_1.GatewayIntentBits.MessageContent,
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.GuildMessageReactions
    ],
    partials: [
        discord_js_1.Partials.Message,
        discord_js_1.Partials.Reaction,
        discord_js_1.Partials.Channel
    ]
});
if (process.env.NODE_ENV === "production")
    exports.client.trackSentry();
else
    logging_1.Log.debug("Ignoring Sentry tracking for NEST while in development.");
(async function () {
    exports.client.on("error", (err) => (0, GenUtils_1.handleError)(err));
    await (0, config_1.validateConfig)(GlobalScope_1.Scope.Default).catch((err) => (0, GenUtils_1.handleError)(err)).then(() => logging_1.Log.info("Successfully validated the configuration file."));
    exports.client.run(config_1.config.token);
    await (0, InitializeModules_1.initializeModules)(exports.client).catch((err) => (0, GenUtils_1.handleError)(err)).then(() => logging_1.Log.info("Successfully initialized all modules."));
    await (0, HandleFunnyMutes_1.load)(exports.client).catch((err) => (0, GenUtils_1.handleError)(err)).then(() => logging_1.Log.info("Successfully registered funny mutes."));
    await (0, Mongoose_1.default)().catch((err) => (0, GenUtils_1.handleError)(err)).then(() => logging_1.Log.info("Database connected successfully."));
    await Promise.all([
        Promise.resolve().then(() => __importStar(require("./events/autorun/checks/BanCheck"))),
        Promise.resolve().then(() => __importStar(require("./events/autorun/checks/CaseActive"))),
        Promise.resolve().then(() => __importStar(require("./events/ticket/TicketDelete"))),
        Promise.resolve().then(() => __importStar(require("./events/autorun/RoleBans"))),
        Promise.resolve().then(() => __importStar(require("./events/market/PostExpiration"))),
        Promise.resolve().then(() => __importStar(require("./events/autorun/checks/CleanExpiredData"))),
        Promise.resolve().then(() => __importStar(require("./events/autorun/checks/DataErasure"))),
        Promise.resolve().then(() => __importStar(require("./events/market/QueueOwnershipAutoRelease"))),
        Promise.resolve().then(() => __importStar(require("./events/autorun/checks/AutomaticPostBacklog")))
    ]);
})();
