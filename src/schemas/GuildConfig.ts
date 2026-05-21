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
  roleIds: string[];   // Discord role IDs allowed to use the AI
  premium: boolean;    // reserved for tier rollout
  model: string;       // overridable per-server later
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
  enabled: { type: Boolean, default: false },
  roleIds: { type: [String], default: [] },
  premium: { type: Boolean, default: false },
  model:   { type: String,  default: 'claude-haiku-4-5' },
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
  aiAccess: { type: guildAiAccessSchema, default: () => ({ enabled: false, roleIds: [], premium: false, model: 'claude-haiku-4-5' }) },
  automod:  { type: guildAutomodSchema,  default: () => ({ enabled: false, alertChannelId: null, bypassRoleIds: [], modules: {
    massMention: { enabled: false, maxMentions: 5, action: 'delete', aiCheck: false },
    links:       { enabled: false, mode: 'block_new_accounts', minAccountDays: 7, domainList: [], action: 'delete', aiCheck: false },
    accountAge:  { enabled: false, minServerDays: 0, minAccountDays: 7, action: 'alert', aiCheck: false },
    spamRate:    { enabled: false, maxMessages: 5, windowSeconds: 10, action: 'delete_timeout', aiCheck: false },
    wordFilter:  { enabled: false, words: [], action: 'delete', aiCheck: false },
  } }) },
}, {
  timestamps: true,
  collection: 'nest_guild_configs',
})

export default mongoose.model<GuildConfig>('GuildConfig', schema)
