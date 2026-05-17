import GuildConfigModel, { GuildConfig } from '../schemas/GuildConfig'

interface CacheEntry {
  config: GuildConfig
  expiresAt: number
}

const TTL_MS = 5 * 60 * 1000 // 5 minutes
const cache = new Map<string, CacheEntry>()

/**
 * Cache-first lookup for a guild's configuration document.
 * Returns null if the guild has no config document yet.
 */
export async function getGuildConfig(guildId: string): Promise<GuildConfig | null> {
  const entry = cache.get(guildId)
  if (entry && entry.expiresAt > Date.now()) {
    return entry.config
  }

  const config = await GuildConfigModel.findOne({ guildId }).lean<GuildConfig>()
  if (config) {
    cache.set(guildId, { config, expiresAt: Date.now() + TTL_MS })
  }
  return config ?? null
}

/**
 * Evict a guild's config from the in-memory cache.
 * Call this after any write to the GuildConfig document.
 */
export function invalidateGuildConfig(guildId: string): void {
  cache.delete(guildId)
}

/**
 * Returns the guild config, creating one with defaults if it does not yet exist.
 */
export async function getOrCreateGuildConfig(guildId: string, guildName: string): Promise<GuildConfig> {
  const existing = await getGuildConfig(guildId)
  if (existing) return existing

  const created = await GuildConfigModel.findOneAndUpdate(
    { guildId },
    {
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
    },
    { upsert: true, new: true }
  ).lean<GuildConfig>()

  if (created) {
    cache.set(guildId, { config: created, expiresAt: Date.now() + TTL_MS })
    return created
  }

  // Fallback: should not happen after upsert, but fetch again to be safe
  const fallback = await GuildConfigModel.findOne({ guildId }).lean<GuildConfig>()
  if (!fallback) throw new Error(`Failed to create GuildConfig for guild ${guildId}`)
  cache.set(guildId, { config: fallback, expiresAt: Date.now() + TTL_MS })
  return fallback
}
