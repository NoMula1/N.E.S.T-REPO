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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _CoreClient_clientId, _CoreClient_interactionsPerHour;
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const logging_1 = require("../utils/logging");
const GlobalScope_1 = require("./GlobalScope");
const Sentry = __importStar(require("@sentry/node"));
class CoreClient extends discord_js_1.Client {
    constructor(clientId, options) {
        const intents = [
            discord_js_1.GatewayIntentBits.GuildMembers,
            discord_js_1.GatewayIntentBits.GuildMessageReactions,
            discord_js_1.GatewayIntentBits.GuildMessages,
            discord_js_1.GatewayIntentBits.Guilds,
            discord_js_1.GatewayIntentBits.MessageContent
        ];
        const partials = [
            discord_js_1.Partials.Message,
            discord_js_1.Partials.Reaction,
            discord_js_1.Partials.GuildMember,
            discord_js_1.Partials.Channel
        ];
        if (options.intents instanceof Array)
            intents.push.apply(intents, options.intents);
        if (options.partials instanceof Array)
            partials.push.apply(partials, options.partials);
        super({
            ...options,
            intents,
            partials
        });
        _CoreClient_clientId.set(this, void 0);
        _CoreClient_interactionsPerHour.set(this, void 0);
        this.slashcommands = new discord_js_1.Collection;
        this.contextcommands = new discord_js_1.Collection;
        this.simplecommands = new discord_js_1.Collection;
        __classPrivateFieldSet(this, _CoreClient_clientId, clientId, "f");
        __classPrivateFieldSet(this, _CoreClient_interactionsPerHour, 0, "f");
        CoreClient.instance = this;
    }
    /** Starts the client. */
    async run(token) {
        try {
            await this.login(token);
            logging_1.Log.info(`NEST Started (scope: ${(0, GlobalScope_1.toString)(GlobalScope_1.scope)})`);
        }
        catch (e) {
            console.log('Error starting NEST');
            console.error(e);
        }
    }
    async registerCommands() {
        const rest = new discord_js_1.REST({ version: '10' }).setToken(this.token);
        const toRegister = [
            ...this.slashcommands.values(),
            ...this.contextcommands.values(),
            ...this.simplecommands.values()
        ];
        try {
            logging_1.Log.info(`Registering all commands (${toRegister.length}).`);
            // console.log(toRegister)
            await rest.put(discord_js_1.Routes.applicationCommands(__classPrivateFieldGet(this, _CoreClient_clientId, "f")), { body: toRegister.map(command => command.toJSON()) });
            logging_1.Log.info("Registered all commands");
        }
        catch (error) {
            logging_1.Log.error("Failed to register commands: " + error);
        }
    }
    get clientId() {
        return __classPrivateFieldGet(this, _CoreClient_clientId, "f");
    }
    trackSentry() {
        Sentry.init({
            dsn: "https://ff0cde4561994bbe547fa7c140ca3b14@o4509086172184576.ingest.us.sentry.io/4509129559638016",
            environment: __classPrivateFieldGet(this, _CoreClient_clientId, "f"),
            // Tracing
            tracesSampleRate: 1.0, //  Capture 100% of the transactions
        });
    }
    trackInteractions() {
        const increment = () => {
            var _a;
            __classPrivateFieldSet(this, _CoreClient_interactionsPerHour, (_a = __classPrivateFieldGet(this, _CoreClient_interactionsPerHour, "f"), _a++, _a), "f");
            setTimeout(() => {
                var _a;
                __classPrivateFieldSet(this, _CoreClient_interactionsPerHour, (_a = __classPrivateFieldGet(this, _CoreClient_interactionsPerHour, "f"), _a--, _a), "f");
            }, 3600000); // 1 hour
        };
        addEventListener(discord_js_1.Events.MessageCreate, increment);
        addEventListener(discord_js_1.Events.InteractionCreate, increment);
    }
    get interactionsPerHour() {
        return __classPrivateFieldGet(this, _CoreClient_interactionsPerHour, "f");
    }
}
_CoreClient_clientId = new WeakMap(), _CoreClient_interactionsPerHour = new WeakMap();
exports.default = CoreClient;
