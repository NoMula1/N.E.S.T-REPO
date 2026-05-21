import mongoose from "mongoose"

export interface HelpRole {
  name: string;
  roleId: string;
}

export interface GuildRoles {
  MarketStaff?: string;
  TrialHelpModerator?: string;
  HelpModerator?: string;
  MarketModerator?: string;
  MarketManager?: string;
  HelpManager?: string;
  AssistantModerator?: string;
  Moderator?: string;
  SeniorModerator?: string;
  SeniorMarketModerator?: string;
  AssistantAdministrator?: string;
  Administrator?: string;
  InternalReviewer?: string;
  ServerBooster?: string;
  /* Developer tiers */
  MasterDeveloper?: string;
  ExpertDeveloper?: string;
  SeniorDeveloper?: string;
  Developer?: string;
  NoviceDeveloper?: string;
}

export interface GuildChannels {
  botCommands?: string;
  modMail?: string;
  qotd?: string;
  modLog?: string;
  forHire?: string;
  hiring?: string;
  selling?: string;
  helpForum?: string;
  internalAffairs?: string;
  ticketsCategoryGeneral?: string;
  ticketsCategoryTrading?: string;
  ticketsCategoryMarket?: string;
  ticketsCategoryBusiness?: string;
  templateApprovals?: string;
  templateApprovalLog?: string;
  reports?: string;
}

export interface GuildFeatures {
  marketplace: boolean;
  moderation: boolean;
  tickets: boolean;
  qotd: boolean;
}

/** AI Portal — drives the NightHawk-AI assistant feature.
 *  v1: bot enforces a server allowlist (NIGHTHAWK_GUILD_ID env).
 *  Future: gate on `aiAccess.premium` once the premium tier ships. */
export interface GuildAiAccess {
  enabled: boolean;
  roleIds: string[];   // Discord role IDs allowed to use the AI in channels
  premium: boolean;    // reserved for tier rollout
  model: string;       // overridable per-server later
  /* DM mode — allowed users can private-message the bot directly for
     reminders, memory, general chat. Server-tools are unavailable in DMs.
     Only configurable on the primary NightHawk hub guild
     (NIGHTHAWK_GUILD_ID). The bot reads this guild's allowlist when
     processing DMs since DMs aren't tied to any guild. */
  dmEnabled: boolean;
  dmAllowedUserIds: string[];
}

/** Automod per-module action — what happens when a rule fires. */
export type AutomodAction = 'alert' | 'delete' | 'delete_timeout'

export interface AutomodModuleBase {
  enabled: boolean;
  action: AutomodAction;
  aiCheck: boolean;  // Phase 2: route Layer 1 hit through Claude before action
}

export interface GuildAutomod {
  enabled: boolean;
  alertChannelId: string | null;
  bypassRoleIds: string[];   // any of these roles → skip automod entirely
  modules: {
    massMention: AutomodModuleBase & { maxMentions: number };
    links:       AutomodModuleBase & {
      mode: 'block_all' | 'block_new_accounts' | 'blocklist' | 'allowlist';
      minAccountDays: number;
      domainList: string[];
    };
    accountAge:  AutomodModuleBase & { minServerDays: number; minAccountDays: number };
    spamRate:    AutomodModuleBase & { maxMessages: number; windowSeconds: number };
    wordFilter:  AutomodModuleBase & { words: string[] };
  };
  aiAutomod: GuildAiAutomod;
}

/** AI Moderation — Claude can act AS the automod, not just as a Layer 1
 *  confirmer. Three modes determine what the AI sees. */
export type AiAutomodMode = 'confirm_layer1' | 'sample_all' | 'scan_all'
export interface GuildAiAutomod {
  enabled: boolean;
  mode: AiAutomodMode;
  sampleRate: number;          // 0-100, only relevant when mode=sample_all
  action: AutomodAction;       // what to do when AI flags scam/spam
  skipChannelIds: string[];    // channels never scanned
  batchSize: number;           // messages per Claude call
  batchIntervalSeconds: number;// flush interval
  /* Vision / image scanning — patches the image-only scam gap.
     Even when text has nothing flaggable, the AI can read the attached
     image and flag (fake giveaway screenshots, Robux scams, phishing UI).
     Cost-controlled: sample rate + daily image cap. */
  scanImages: boolean;           // when true, attach images to AI calls
  imageSampleRate: number;       // 0-100 — odds an eligible image gets attached
  imageDailyCap: number;         // max images sent to Claude per day (hard stop)
  imageReputationSkip: boolean;  // skip images from trusted accounts (>90d + role)
}

export interface GuildConfig {
  guildId: string;         // unique index
  guildName: string;
  guildIcon?: string;
  linked: boolean;         // true = verified link through website
  linkedBy?: string;       // NightHawk userId who linked
  linkToken?: string;      // one-time token for /setup <-> website handshake
  linkTokenExpires?: Date;
  roles: GuildRoles;
  channels: GuildChannels;
  features: GuildFeatures;
  requirePostApproval: boolean;
  postApprovalLottery: number; // 0-1
  helpRoles: HelpRole[];
  marketplaceEnabled: boolean;
  moderationEnabled: boolean;
  ticketsEnabled: boolean;
  aiAccess: GuildAiAccess;
  automod: GuildAutomod;
  createdAt: Date;
  updatedAt: Date;
}

const helpRoleEntrySchema = new mongoose.Schema<HelpRole>({
  name:   { type: String, required: true },
  roleId: { type: String, required: true },
}, { _id: false })

const guildRolesSchema = new mongoose.Schema<GuildRoles>({
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
  MasterDeveloper: String,
  ExpertDeveloper: String,
  SeniorDeveloper: String,
  Developer: String,
  NoviceDeveloper: String,
}, { _id: false })

const guildChannelsSchema = new mongoose.Schema<GuildChannels>({
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
}, { _id: false })

const guildFeaturesSchema = new mongoose.Schema<GuildFeatures>({
  marketplace: { type: Boolean, default: true },
  moderation: { type: Boolean, default: true },
  tickets: { type: Boolean, default: true },
  qotd: { type: Boolean, default: true },
}, { _id: false })

const guildAiAccessSchema = new mongoose.Schema<GuildAiAccess>({
  enabled:          { type: Boolean, default: false },
  roleIds:          { type: [String], default: [] },
  premium:          { type: Boolean, default: false },
  model:            { type: String,  default: 'claude-sonnet-4-5' },
  dmEnabled:        { type: Boolean, default: false },
  dmAllowedUserIds: { type: [String], default: [] },
}, { _id: false })

/* eslint-disable @typescript-eslint/no-explicit-any */
const guildAutomodSchema = new mongoose.Schema<GuildAutomod>({
  enabled:        { type: Boolean, default: false },
  alertChannelId: { type: String,  default: null },
  bypassRoleIds:  { type: [String], default: [] },
  modules: {
    massMention: new mongoose.Schema({
      enabled:     { type: Boolean, default: false },
      maxMentions: { type: Number,  default: 5 },
      action:      { type: String,  default: 'delete' },
      aiCheck:     { type: Boolean, default: false },
    } as any, { _id: false }),
    links: new mongoose.Schema({
      enabled:        { type: Boolean, default: false },
      mode:           { type: String,  default: 'block_new_accounts' },
      minAccountDays: { type: Number,  default: 7 },
      domainList:     { type: [String], default: [] },
      action:         { type: String,  default: 'delete' },
      aiCheck:        { type: Boolean, default: false },
    } as any, { _id: false }),
    accountAge: new mongoose.Schema({
      enabled:        { type: Boolean, default: false },
      minServerDays:  { type: Number,  default: 0 },
      minAccountDays: { type: Number,  default: 7 },
      action:         { type: String,  default: 'alert' },
      aiCheck:        { type: Boolean, default: false },
    } as any, { _id: false }),
    spamRate: new mongoose.Schema({
      enabled:       { type: Boolean, default: false },
      maxMessages:   { type: Number,  default: 5 },
      windowSeconds: { type: Number,  default: 10 },
      action:        { type: String,  default: 'delete_timeout' },
      aiCheck:       { type: Boolean, default: false },
    } as any, { _id: false }),
    wordFilter: new mongoose.Schema({
      enabled: { type: Boolean, default: false },
      words:   { type: [String], default: [] },
      action:  { type: String,  default: 'delete' },
      aiCheck: { type: Boolean, default: false },
    } as any, { _id: false }),
  },
  aiAutomod: new mongoose.Schema({
    enabled:              { type: Boolean, default: false },
    mode:                 { type: String,  default: 'confirm_layer1' },
    sampleRate:           { type: Number,  default: 10 },
    action:               { type: String,  default: 'alert' },
    skipChannelIds:       { type: [String], default: [] },
    batchSize:            { type: Number,  default: 10 },
    batchIntervalSeconds: { type: Number,  default: 20 },
    scanImages:           { type: Boolean, default: false },
    imageSampleRate:      { type: Number,  default: 25 },
    imageDailyCap:        { type: Number,  default: 500 },
    imageReputationSkip:  { type: Boolean, default: true  },
  } as any, { _id: false }),
}, { _id: false })

const schema = new mongoose.Schema<GuildConfig>({
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
  helpRoles: { type: [helpRoleEntrySchema], default: [] },
  marketplaceEnabled: { type: Boolean, default: true },
  moderationEnabled: { type: Boolean, default: true },
  ticketsEnabled: { type: Boolean, default: true },
  aiAccess: { type: guildAiAccessSchema, default: () => ({ enabled: false, roleIds: [], premium: false, model: 'claude-sonnet-4-5', dmEnabled: false, dmAllowedUserIds: [] }) },
  automod:  { type: guildAutomodSchema,  default: () => ({ enabled: false, alertChannelId: null, bypassRoleIds: [], modules: {
    massMention: { enabled: false, maxMentions: 5, action: 'delete', aiCheck: false },
    links:       { enabled: false, mode: 'block_new_accounts', minAccountDays: 7, domainList: [], action: 'delete', aiCheck: false },
    accountAge:  { enabled: false, minServerDays: 0, minAccountDays: 7, action: 'alert', aiCheck: false },
    spamRate:    { enabled: false, maxMessages: 5, windowSeconds: 10, action: 'delete_timeout', aiCheck: false },
    wordFilter:  { enabled: false, words: [], action: 'delete', aiCheck: false },
  }, aiAutomod: {
    enabled: false, mode: 'confirm_layer1', sampleRate: 10, action: 'alert',
    skipChannelIds: [], batchSize: 10, batchIntervalSeconds: 20,
    scanImages: false, imageSampleRate: 25, imageDailyCap: 500, imageReputationSkip: true,
  } }) },
}, {
  timestamps: true,
  collection: 'nest_guild_configs',
})

export default mongoose.model<GuildConfig>('GuildConfig', schema)
