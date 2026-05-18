"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGuildConfig = getGuildConfig;
exports.invalidateGuildConfig = invalidateGuildConfig;
exports.getOrCreateGuildConfig = getOrCreateGuildConfig;
const GuildConfig_1 = __importDefault(require("../schemas/GuildConfig"));
const TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map();
/**
 * Cache-first lookup for a guild's configuration document.
 * Returns null if the guild has no config document yet.
 */
async function getGuildConfig(guildId) {
    const entry = cache.get(guildId);
    if (entry && entry.expiresAt > Date.now()) {
        return entry.config;
    }
    const config = await GuildConfig_1.default.findOne({ guildId }).lean();
    if (config) {
        cache.set(guildId, { config, expiresAt: Date.now() + TTL_MS });
    }
    return config !== null && config !== void 0 ? config : null;
}
/**
 * Evict a guild's config from the in-memory cache.
 * Call this after any write to the GuildConfig document.
 */
function invalidateGuildConfig(guildId) {
    cache.delete(guildId);
}
/**
 * Returns the guild config, creating one with defaults if it does not yet exist.
 */
async function getOrCreateGuildConfig(guildId, guildName) {
    const existing = await getGuildConfig(guildId);
    if (existing)
        return existing;
    const created = await GuildConfig_1.default.findOneAndUpdate({ guildId }, {
        $setOnInsert: {
            guildId,
            guildName,
            linked: false,
            roles: {},
            channels: {},
            features: {
                marketplace: true,
                moderation: true,
                tickets: true,
                qotd: true,
            },
            requirePostApproval: true,
            postApprovalLottery: 0,
            marketplaceEnabled: true,
            moderationEnabled: true,
            ticketsEnabled: true,
        },
    }, { upsert: true, new: true }).lean();
    if (created) {
        cache.set(guildId, { config: created, expiresAt: Date.now() + TTL_MS });
        return created;
    }
    // Fallback: should not happen after upsert, but fetch again to be safe
    const fallback = await GuildConfig_1.default.findOne({ guildId }).lean();
    if (!fallback)
        throw new Error(`Failed to create GuildConfig for guild ${guildId}`);
    cache.set(guildId, { config: fallback, expiresAt: Date.now() + TTL_MS });
    return fallback;
}
