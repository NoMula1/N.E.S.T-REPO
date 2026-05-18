"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const guildRolesSchema = new mongoose_1.default.Schema({
    MarketStaff: String,
    TrialHelpModerator: String,
    HelpModerator: String,
    MarketModerator: String,
    MarketManager: String,
    HelpManager: String,
    AssistantModerator: String,
    Moderator: String,
    SeniorModerator: String,
    SeniorMarketModerator: String,
    AssistantAdministrator: String,
    Administrator: String,
    InternalReviewer: String,
    ServerBooster: String,
}, { _id: false });
const guildChannelsSchema = new mongoose_1.default.Schema({
    botCommands: String,
    modMail: String,
    qotd: String,
    modLog: String,
    forHire: String,
    hiring: String,
    selling: String,
    helpForum: String,
    internalAffairs: String,
    ticketsCategoryGeneral: String,
    ticketsCategoryTrading: String,
    ticketsCategoryMarket: String,
    ticketsCategoryBusiness: String,
    templateApprovals: String,
    templateApprovalLog: String,
    reports: String,
}, { _id: false });
const guildFeaturesSchema = new mongoose_1.default.Schema({
    marketplace: { type: Boolean, default: true },
    moderation: { type: Boolean, default: true },
    tickets: { type: Boolean, default: true },
    qotd: { type: Boolean, default: true },
}, { _id: false });
const schema = new mongoose_1.default.Schema({
    guildId: { type: String, required: true, unique: true },
    guildName: { type: String, required: true },
    guildIcon: String,
    linked: { type: Boolean, default: false },
    linkedBy: String,
    linkToken: String,
    linkTokenExpires: Date,
    roles: { type: guildRolesSchema, default: () => ({}) },
    channels: { type: guildChannelsSchema, default: () => ({}) },
    features: { type: guildFeaturesSchema, default: () => ({ marketplace: true, moderation: true, tickets: true, qotd: true }) },
    requirePostApproval: { type: Boolean, default: true },
    postApprovalLottery: { type: Number, min: 0, max: 1, default: 0 },
    marketplaceEnabled: { type: Boolean, default: true },
    moderationEnabled: { type: Boolean, default: true },
    ticketsEnabled: { type: Boolean, default: true },
}, {
    timestamps: true,
    collection: 'nest_guild_configs',
});
exports.default = mongoose_1.default.model('GuildConfig', schema);
