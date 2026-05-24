/* ============================================================
   NightHawk AI — read-only server-info tools.
   Fetch messages from any channel, list invites, audit log etc.
============================================================ */
import {
	ChannelType,
	type Guild,
	GuildAuditLogsEntry,
	type Message,
	TextChannel,
} from "discord.js"

export const SERVER_INFO_TOOL_DEFINITIONS = [
	{
		name: "get_channel_messages",
		description: "Fetch the most recent N messages from a specific channel. Use for cross-channel context (current channel is already in conversation history).",
		input_schema: {
			type: "object",
			properties: {
				channel_id: { type: "string", description: "Channel to read from" },
				limit: { type: "number", description: "Number of recent messages (1-100, default 50)" },
			},
			required: ["channel_id"],
		},
	},
	{
		name: "get_channel_info",
		description: "Get detailed info about a single channel — type, parent, topic, slowmode, member count, permission overwrites.",
		input_schema: {
			type: "object",
			properties: {
				channel_id: { type: "string", description: "Channel to inspect" },
			},
			required: ["channel_id"],
		},
	},
	{
		name: "get_invite_links",
		description: "List all active invite links in the server.",
		input_schema: { type: "object", properties: {} },
	},
	{
		name: "get_audit_log",
		description: "Fetch the most recent Discord audit-log entries for this server. Shows who did what (joins, role changes, bans, channel updates etc.).",
		input_schema: {
			type: "object",
			properties: {
				limit: { type: "number", description: "Number of entries (1-100, default 25)" },
			},
		},
	},
	{
		name: "get_server_stats",
		description: "Top-level server stats: total members, bot count, role count, channel count, premium tier, region, owner.",
		input_schema: { type: "object", properties: {} },
	},
]

interface ExecContext {
	guild: Guild
	message: Message
}

export async function executeServerInfoTool(
	toolName: string,
	input: Record<string, unknown>,
	ctx: ExecContext,
): Promise<string> {
	const { guild } = ctx

	try {
		switch (toolName) {

			/* ── GET_CHANNEL_MESSAGES ── */
			case "get_channel_messages": {
				const channel = guild.channels.cache.get(String(input.channel_id || "")) as TextChannel | undefined
				if (!channel || channel.type !== ChannelType.GuildText) return "Error: text channel not found."
				const limit = Math.max(1, Math.min(100, Math.floor(Number(input.limit) || 50)))
				const fetched = await channel.messages.fetch({ limit })
				const out = Array.from(fetched.values())
					.reverse()
					.map(m => {
						const unix = Math.floor(m.createdAt.getTime() / 1000)
						return {
							messageId: m.id,
							channelId: channel.id,
							authorName: m.author.username,
							authorId: m.author.id,
							authorMention: `<@${m.author.id}>`,
							bot: m.author.bot,
							content: (m.content || "").slice(0, 240),
							attachmentCount: m.attachments.size,
							timestamp: m.createdAt.toISOString(),
							discordTimestamp: `<t:${unix}:R>`,
							jumpLink: `https://discord.com/channels/${guild.id}/${channel.id}/${m.id}`,
						}
					})
				return JSON.stringify({
					channelMention: `<#${channel.id}>`,
					channelName: `#${channel.name}`,
					channelId: channel.id,
					guildId: guild.id,
					count: out.length,
					// authorMention + jumpLink are pre-built — paste directly into Discord
					// for proper @ highlighting and clickable message links.
					messages: out,
				}, null, 2)
			}

			/* ── GET_CHANNEL_INFO ── */
			case "get_channel_info": {
				const channel = guild.channels.cache.get(String(input.channel_id || ""))
				if (!channel) return "Error: channel not found."
				const overwrites = "permissionOverwrites" in channel
					? Array.from(channel.permissionOverwrites.cache.values()).map(o => ({
						type: o.type === 0 ? "role" : "member",
						id: o.id,
						allow: o.allow.toArray(),
						deny: o.deny.toArray(),
					}))
					: []
				return JSON.stringify({
					id: channel.id,
					name: channel.name,
					type: ChannelType[channel.type],
					parentId: channel.parentId,
					parentName: channel.parent?.name,
					topic: "topic" in channel ? channel.topic : null,
					rateLimitPerUser: "rateLimitPerUser" in channel ? channel.rateLimitPerUser : null,
					nsfw: "nsfw" in channel ? channel.nsfw : null,
					createdAt: channel.createdAt?.toISOString(),
					permissionOverwrites: overwrites,
				}, null, 2)
			}

			/* ── GET_INVITE_LINKS ── */
			case "get_invite_links": {
				const invites = await guild.invites.fetch()
				const list = Array.from(invites.values()).map(i => ({
					code: i.code,
					url: i.url,
					channel: i.channel?.name,
					inviter: i.inviter?.username,
					uses: i.uses,
					maxUses: i.maxUses,
					expiresAt: i.expiresAt?.toISOString() || null,
				}))
				return JSON.stringify({ count: list.length, invites: list }, null, 2)
			}

			/* ── GET_AUDIT_LOG ── */
			case "get_audit_log": {
				const limit = Math.max(1, Math.min(100, Math.floor(Number(input.limit) || 25)))
				const log = await guild.fetchAuditLogs({ limit })
				const entries = log.entries.map((e: GuildAuditLogsEntry) => ({
					id: e.id,
					action: e.action,
					actionType: e.actionType,
					executor: e.executor?.username || null,
					executorId: e.executor?.id || null,
					target: e.target ? (
						typeof e.target === "object" && "username" in e.target ? e.target.username :
						typeof e.target === "object" && "name" in e.target ? (e.target as { name: string }).name :
						"unknown"
					) : null,
					reason: e.reason,
					createdAt: e.createdAt.toISOString(),
				}))
				return JSON.stringify({ count: entries.length, entries }, null, 2)
			}

			/* ── GET_SERVER_STATS ── */
			case "get_server_stats": {
				const totalMembers = guild.memberCount
				const cachedMembers = guild.members.cache
				const botCount = cachedMembers.filter(m => m.user.bot).size
				const owner = await guild.fetchOwner().catch(() => null)
				return JSON.stringify({
					id: guild.id,
					name: guild.name,
					ownerId: guild.ownerId,
					ownerTag: owner?.user.tag || null,
					createdAt: guild.createdAt.toISOString(),
					totalMembers,
					cachedBots: botCount,
					roleCount: guild.roles.cache.size,
					channelCount: guild.channels.cache.size,
					categoryCount: guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size,
					textChannelCount: guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size,
					voiceChannelCount: guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size,
					premiumTier: guild.premiumTier,
					premiumSubscriptionCount: guild.premiumSubscriptionCount,
					verificationLevel: guild.verificationLevel,
					preferredLocale: guild.preferredLocale,
					afkChannelId: guild.afkChannelId,
				}, null, 2)
			}

			default:
				return `Error: unknown server-info tool '${toolName}'`
		}
	} catch (e) {
		return `Error: ${(e as Error).message}`
	}
}
