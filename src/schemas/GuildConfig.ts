import mongoose from "mongoose"

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
}

export interface GuildChannels {
  botCommands?: string;
  modMail?: string;
  qotd?: string;
  modLog?: string;
  forHire?: string;
  hiring?: string;
  selling?: string;
  internalAffairs?: string;
  ticketsCategory?: string;
}

export interface GuildFeatures {
  marketplace: boolean;
  moderation: boolean;
  tickets: boolean;
  qotd: boolean;
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
  marketplaceEnabled: boolean;
  moderationEnabled: boolean;
  ticketsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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
}, { _id: false })

const guildChannelsSchema = new mongoose.Schema<GuildChannels>({
  botCommands: String,
  modMail: String,
  qotd: String,
  modLog: String,
  forHire: String,
  hiring: String,
  selling: String,
  internalAffairs: String,
  ticketsCategory: String,
}, { _id: false })

const guildFeaturesSchema = new mongoose.Schema<GuildFeatures>({
  marketplace: { type: Boolean, default: true },
  moderation: { type: Boolean, default: true },
  tickets: { type: Boolean, default: true },
  qotd: { type: Boolean, default: true },
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
  marketplaceEnabled: { type: Boolean, default: true },
  moderationEnabled: { type: Boolean, default: true },
  ticketsEnabled: { type: Boolean, default: true },
}, {
  timestamps: true,
  collection: 'nest_guild_configs',
})

export default mongoose.model<GuildConfig>('GuildConfig', schema)
