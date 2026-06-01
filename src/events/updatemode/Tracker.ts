/* ──────────────────────────────────────────────────────────────────
   Update Mode tracker — logs server changes while a guild is in Update
   Mode. Each handler bails instantly (Set check) when the guild isn't
   tracking, so this is cheap on the hot path.

   The framework registers any `on<Event>` export (see RegisterEvents);
   the first arg is the framework's EventOptions, the rest are the
   discord.js event payload.
   ────────────────────────────────────────────────────────────────── */
import { EventOptions } from "../../utils/RegisterEvents"
import { recordChange, refreshActive } from "../../utils/updateMode"

const guildIdOf = (x: any): string | null => x?.guild?.id ?? null

export default {
	// Repopulate the active-tracking set on startup so tracking survives restarts.
	async onReady() {
		await refreshActive()
	},

	// ─── Channels ───
	async onChannelCreate(_: EventOptions, channel: any) {
		const g = guildIdOf(channel); if (!g) return
		await recordChange(g, "channels", "created", channel.name || "channel")
	},
	async onChannelDelete(_: EventOptions, channel: any) {
		const g = guildIdOf(channel); if (!g) return
		await recordChange(g, "channels", "deleted", channel.name || "channel")
	},
	async onChannelUpdate(_: EventOptions, oldCh: any, newCh: any) {
		const g = guildIdOf(newCh); if (!g) return
		if (oldCh?.name && newCh?.name && oldCh.name !== newCh.name) {
			await recordChange(g, "channels", "renamed", newCh.name, `from "${oldCh.name}"`)
		}
	},

	// ─── Roles ───
	async onRoleCreate(_: EventOptions, role: any) {
		const g = guildIdOf(role); if (!g) return
		await recordChange(g, "roles", "added", role.name || "role")
	},
	async onRoleDelete(_: EventOptions, role: any) {
		const g = guildIdOf(role); if (!g) return
		await recordChange(g, "roles", "deleted", role.name || "role")
	},
	async onRoleUpdate(_: EventOptions, oldRole: any, newRole: any) {
		const g = guildIdOf(newRole); if (!g) return
		if (oldRole?.name && newRole?.name && oldRole.name !== newRole.name) {
			await recordChange(g, "roles", "renamed", newRole.name, `from "${oldRole.name}"`)
		}
	},

	// ─── Emojis ───
	async onEmojiCreate(_: EventOptions, emoji: any) {
		const g = guildIdOf(emoji); if (!g) return
		await recordChange(g, "emojis", "added", emoji.name || "emoji")
	},
	async onEmojiDelete(_: EventOptions, emoji: any) {
		const g = guildIdOf(emoji); if (!g) return
		await recordChange(g, "emojis", "deleted", emoji.name || "emoji")
	},
	async onEmojiUpdate(_: EventOptions, oldEmoji: any, newEmoji: any) {
		const g = guildIdOf(newEmoji); if (!g) return
		if (oldEmoji?.name && newEmoji?.name && oldEmoji.name !== newEmoji.name) {
			await recordChange(g, "emojis", "renamed", newEmoji.name, `from "${oldEmoji.name}"`)
		}
	},

	// ─── Server settings ───
	async onGuildUpdate(_: EventOptions, oldGuild: any, newGuild: any) {
		const g = newGuild?.id; if (!g) return
		if (oldGuild?.name !== newGuild?.name) {
			await recordChange(g, "settings", "renamed", newGuild.name || "server", `from "${oldGuild?.name || "?"}"`)
		} else {
			// Note the most likely changed surface without diffing everything.
			const changed =
				oldGuild?.iconURL?.() !== newGuild?.iconURL?.() ? "server icon" :
				oldGuild?.bannerURL?.() !== newGuild?.bannerURL?.() ? "server banner" :
				oldGuild?.description !== newGuild?.description ? "description" :
				oldGuild?.vanityURLCode !== newGuild?.vanityURLCode ? "vanity URL" :
				"settings"
			await recordChange(g, "settings", "updated", changed)
		}
	},

	// ─── Bots added ───
	async onGuildMemberAdd(_: EventOptions, member: any) {
		if (!member?.user?.bot) return
		const g = member?.guild?.id; if (!g) return
		await recordChange(g, "bots", "added", member.user.username || member.user.tag || "bot")
	},
}
