/** Utilities for giveaways */
import { GuildMember } from "discord.js"

/** Parse simple durations like "1h", "30m", "2d" into milliseconds. */
export function parseDurationToMs(input: string): number | null {
  if (!input) return null
  const m = input.match(/^(\d+)\s*(s|m|h|d)$/i)
  if (!m) return null
  const n = Number(m[1])
  const unit = m[2].toLowerCase()
  switch (unit) {
    case "s": return n * 1000
    case "m": return n * 60 * 1000
    case "h": return n * 60 * 60 * 1000
    case "d": return n * 24 * 60 * 60 * 1000
  }
  return null
}

export function pickWinners(entrants: string[], count: number): string[] {
  if (!entrants || entrants.length === 0) return []
  const arr = entrants.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(0, Math.min(count, arr.length))
}

export function memberHasRequiredRole(member: GuildMember | null, roleId?: string | null): boolean {
  if (!roleId) return true
  if (!member) return false
  return member.roles.cache.has(roleId)
}
