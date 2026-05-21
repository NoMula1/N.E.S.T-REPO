/* ============================================================
   NightHawk AI — read-only user-inquiry + message-search tools.
============================================================ */
import {
	ChannelType,
	type Guild,
	type Message,
	TextChannel,
} from "discord.js"

export const INQUIRY_TOOL_DEFINITIONS = [
	{
		name: "get_user_info",
		description: "Look up a Discord member's identity, account age, server join date, roles, presence, and Discord flags. Read-only.",
		input_schema: {
			type: "object",
			properties: {
				user_id: { type: "string", description: "Discord ID of the member" },
			},
			required: ["user_id"],
		},
	},
	{
		name: "search_messages",
		description: "Search recent messages across one or many channels for a substring or regex pattern. Read-only.",
		input_schema: {
			type: "object",
			properties: {
				query: { type: "string", description: "Substring to look for (case-insensitive)" },
				channel_id: { type: "string", description: "Optional: restrict to a single channel" },
				limit_per_channel: { type: "number", description: "Max messages per channel to scan (default 200, max 500)" },
				author_id: { type: "string", description: "Optional: restrict to messages by this author" },
			},
			required: ["query"],
		},
	},
]

interface ExecContext {
	guild: Guild
	message: Message
}

export async function executeInquiryTool(
	toolName: string,
	input: Record<string, unknown>,
	ctx: ExecContext,
): Promise<string> {
	const { guild, message } = ctx

	try {
		switch (toolName) {

			/* ── GET_USER_INFO ── */
			case "get_user_info": {
				const userId = String(input.user_id || "")
				if (!/^\d{17,20}$/.test(userId)) return "Error: invalid Discord ID."

				const member = await guild.members.fetch(userId).catch(() => null)
				if (!member) {
					// Try fetching the User even if they're not in this guild
					const user = await message.client.users.fetch(userId).catch(() => null)
					if (!user) return `Error: user ${userId} not found.`
					return JSON.stringify({
						id: user.id,
						username: user.username,
						displayName: user.globalName || user.username,
						bot: user.bot,
						createdAt: user.createdAt.toISOString(),
						accountAgeDays: Math.floor((Date.now() - user.createdAt.getTime()) / 86400000),
						avatarUrl: user.displayAvatarURL({ size: 512 }),
						note: "User exists but is NOT a member of this server.",
					}, null, 2)
				}

				return JSON.stringify({
					id: member.id,
					username: member.user.username,
					displayName: member.displayName,
					globalName: member.user.globalName,
					nickname: member.nickname,
					bot: member.user.bot,
					createdAt: member.user.createdAt.toISOString(),
					accountAgeDays: Math.floor((Date.now() - member.user.createdAt.getTime()) / 86400000),
					joinedAt: member.joinedAt?.toISOString(),
					serverJoinDaysAgo: member.joinedAt ? Math.floor((Date.now() - member.joinedAt.getTime()) / 86400000) : null,
					roles: member.roles.cache
						.filter(r => r.id !== guild.id)
						.sort((a, b) => b.position - a.position)
						.map(r => ({ id: r.id, name: r.name, color: r.hexColor })),
					presence: member.presence?.status || "offline",
					premiumSince: member.premiumSince?.toISOString() || null,
					avatarUrl: member.user.displayAvatarURL({ size: 512 }),
					flags: member.user.flags?.toArray() || [],
					communicationDisabledUntil: member.communicationDisabledUntil?.toISOString() || null,
				}, null, 2)
			}

			/* ── SEARCH_MESSAGES ── */
			case "search_messages": {
				const query = String(input.query || "").toLowerCase()
				if (!query) return "Error: query is required."
				const limitPerChannel = Math.min(500, Math.max(50, Number(input.limit_per_channel) || 200))
				const onlyAuthorId = input.author_id ? String(input.author_id) : null
				const onlyChannelId = input.channel_id ? String(input.channel_id) : null

				const channels = onlyChannelId
					? [guild.channels.cache.get(onlyChannelId)].filter(Boolean) as TextChannel[]
					: Array.from(guild.channels.cache.values()).filter(c =>
						c.type === ChannelType.GuildText &&
						(c as TextChannel).viewable
					) as TextChannel[]

				if (channels.length === 0) return "Error: no channels available to search."

				const matches: { channel: string; author: string; ts: string; content: string }[] = []
				for (const channel of channels) {
					try {
						const fetched = await channel.messages.fetch({ limit: Math.min(100, limitPerChannel) })
						for (const m of fetched.values()) {
							if (onlyAuthorId && m.author.id !== onlyAuthorId) continue
							if (!m.content.toLowerCase().includes(query)) continue
							matches.push({
								channel: `#${channel.name}`,
								author: m.author.username,
								ts: m.createdAt.toISOString(),
								content: m.content.slice(0, 240),
							})
							if (matches.length >= 50) break // hard cap on results
						}
						if (matches.length >= 50) break
					} catch (_e) { /* ignore unreadable channels */ }
				}

				return JSON.stringify({
					query,
					scope: onlyChannelId ? `<#${onlyChannelId}>` : `${channels.length} channels`,
					matchCount: matches.length,
					matches,
				}, null, 2)
			}

			default:
				return `Error: unknown tool '${toolName}'`
		}
	} catch (e) {
		return `Error: ${(e as Error).message}`
	}
}
