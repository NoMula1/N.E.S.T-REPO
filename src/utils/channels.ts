import { Snowflake } from "discord.js"
import { getGuildConfig } from './GuildConfigCache'
import { GuildChannels } from '../schemas/GuildConfig'

export async function getChannel(guildId: string, key: keyof GuildChannels): Promise<Snowflake | null> {
  const config = await getGuildConfig(guildId)
  return config?.channels?.[key] ?? null
}

// Keep a ChannelKey type for type-safety at call sites
export type ChannelKey = keyof GuildChannels
