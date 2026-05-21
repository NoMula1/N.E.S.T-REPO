/* ============================================================
   NightHawk AI — content-posting tools.
   Send messages and embeds, configure channels, manage threads.
   These tools are NOT destructive — easy to undo, so they skip
   the Confirm/Cancel prompt and run immediately.
============================================================ */
import {
	ChannelType,
	EmbedBuilder,
	type Guild,
	type GuildMember,
	type Message,
	TextChannel,
} from "discord.js"
import { logAuditEntry } from "../audit"

export const CONTENT_TOOL_DEFINITIONS = [
	{
		name: "send_message",
		description: "Send a plain text message to a channel. Optionally ping a role with the message.",
		input_schema: {
			type: "object",
			properties: {
				channel_id: { type: "string", description: "ID of the channel to post to" },
				content: { type: "string", description: "The message text (max 2000 chars)" },
				mention_role_id: { type: "string", description: "Optional: role to @-mention at the start" },
			},
			required: ["channel_id", "content"],
		},
	},
	{
		name: "send_embed",
		description: "Post a rich embed to a channel. Use for announcements, info posts, welcome messages. Supports title, description, color, fields, footer, images, author block.",
		input_schema: {
			type: "object",
			properties: {
				channel_id: { type: "string", description: "ID of the channel to post to" },
				title:       { type: "string", description: "Embed title (max 256 chars)" },
				description: { type: "string", description: "Embed body (max 4096 chars). Discord markdown supported." },
				color:       { type: "string", description: "Hex color like '#FF6B7A' (defaults to NightHawk pink)" },
				url:         { type: "string", description: "URL the title links to" },
				image_url:     { type: "string", description: "Large image URL displayed at the bottom" },
				thumbnail_url: { type: "string", description: "Small image URL displayed in the top-right" },
				author_name:    { type: "string", description: "Author block name" },
				author_icon_url:{ type: "string", description: "Author block icon" },
				footer_text:    { type: "string", description: "Footer text" },
				footer_icon_url:{ type: "string", description: "Footer icon" },
				timestamp: { type: "boolean", description: "If true, stamps the embed with the current time" },
				fields: {
					type: "array",
					description: "List of fields, max 25",
					items: {
						type: "object",
						properties: {
							name:   { type: "string" },
							value:  { type: "string" },
							inline: { type: "boolean" },
						},
						required: ["name", "value"],
					},
				},
				content: { type: "string", description: "Optional text content shown ABOVE the embed (good for @-pings)" },
				mention_role_id: { type: "string", description: "Optional: role to @-mention before the embed" },
			},
			required: ["channel_id"],
		},
	},
	{
		name: "set_channel_topic",
		description: "Set or update the channel topic (the description shown under the channel name).",
		input_schema: {
			type: "object",
			properties: {
				channel_id: { type: "string", description: "ID of the text channel" },
				topic: { type: "string", description: "New topic (max 1024 chars). Empty string clears it." },
			},
			required: ["channel_id", "topic"],
		},
	},
	{
		name: "set_channel_slowmode",
		description: "Set the slowmode (rate limit) for a channel. 0 disables, max 21600 (6 hours).",
		input_schema: {
			type: "object",
			properties: {
				channel_id: { type: "string", description: "ID of the text channel" },
				seconds: { type: "number", description: "Slowmode delay in seconds (0-21600)" },
			},
			required: ["channel_id", "seconds"],
		},
	},
	{
		name: "pin_message",
		description: "Pin a specific message in a channel.",
		input_schema: {
			type: "object",
			properties: {
				channel_id: { type: "string", description: "ID of the channel containing the message" },
				message_id: { type: "string", description: "ID of the message to pin" },
			},
			required: ["channel_id", "message_id"],
		},
	},
	{
		name: "react_to_message",
		description: "Add an emoji reaction to a message. Useful for role-pickers or reactions.",
		input_schema: {
			type: "object",
			properties: {
				channel_id: { type: "string", description: "Channel containing the message" },
				message_id: { type: "string", description: "Message to react to" },
				emoji: { type: "string", description: "Unicode emoji or custom emoji name/ID. Examples: '👍', '✅', 'pepe:123456789'" },
			},
			required: ["channel_id", "message_id", "emoji"],
		},
	},
	{
		name: "create_thread",
		description: "Create a thread in a text channel. Optionally tie it to an existing message.",
		input_schema: {
			type: "object",
			properties: {
				channel_id: { type: "string", description: "Parent text channel" },
				name: { type: "string", description: "Thread name (max 100 chars)" },
				message_id: { type: "string", description: "Optional: anchor message ID. Otherwise creates a standalone thread." },
				auto_archive_minutes: { type: "number", description: "60, 1440 (1d), 4320 (3d), or 10080 (7d). Defaults to 1440." },
			},
			required: ["channel_id", "name"],
		},
	},
	{
		name: "set_nickname",
		description: "Change a member's nickname (their display name in this server only).",
		input_schema: {
			type: "object",
			properties: {
				user_id: { type: "string", description: "Discord ID of the member" },
				nickname: { type: "string", description: "New nickname (max 32 chars). Empty string resets to their default." },
			},
			required: ["user_id", "nickname"],
		},
	},
]

const NIGHTHAWK_PINK = 0xFF6B7A

function parseHexColor(hex: string | undefined, fallback: number): number {
	if (!hex) return fallback
	const cleaned = hex.replace(/^#/, "")
	if (!/^[0-9a-f]{6}$/i.test(cleaned)) return fallback
	return parseInt(cleaned, 16)
}

interface ExecContext {
	guild: Guild
	message: Message
	actor: GuildMember
}

export async function executeContentTool(
	toolName: string,
	input: Record<string, unknown>,
	ctx: ExecContext,
): Promise<string> {
	const { guild, actor } = ctx

	try {
		switch (toolName) {

			/* ── SEND_MESSAGE ── */
			case "send_message": {
				const channel = guild.channels.cache.get(String(input.channel_id || "")) as TextChannel | undefined
				if (!channel || channel.type !== ChannelType.GuildText) return "Error: text channel not found."
				let content = String(input.content || "").slice(0, 1990)
				if (!content.trim()) return "Error: message content is empty."
				if (input.mention_role_id) {
					content = `<@&${input.mention_role_id}> ${content}`
				}
				const sent = await channel.send({ content, allowedMentions: { roles: input.mention_role_id ? [String(input.mention_role_id)] : [] } })
				await logAuditEntry(guild, {
					actor, action: "send_message", success: true,
					summary: `Posted to #${channel.name}`, target: `<#${channel.id}> (msg ${sent.id})`,
					after: { length: content.length, hasPing: !!input.mention_role_id },
				})
				return `Posted to #${channel.name} (message id ${sent.id}).`
			}

			/* ── SEND_EMBED ── */
			case "send_embed": {
				const channel = guild.channels.cache.get(String(input.channel_id || "")) as TextChannel | undefined
				if (!channel || channel.type !== ChannelType.GuildText) return "Error: text channel not found."

				const embed = new EmbedBuilder().setColor(parseHexColor(input.color as string, NIGHTHAWK_PINK))
				if (input.title)       embed.setTitle(String(input.title).slice(0, 256))
				if (input.description) embed.setDescription(String(input.description).slice(0, 4096))
				if (input.url)         embed.setURL(String(input.url))
				if (input.image_url)     embed.setImage(String(input.image_url))
				if (input.thumbnail_url) embed.setThumbnail(String(input.thumbnail_url))
				if (input.author_name) {
					embed.setAuthor({
						name: String(input.author_name).slice(0, 256),
						iconURL: input.author_icon_url ? String(input.author_icon_url) : undefined,
					})
				}
				if (input.footer_text) {
					embed.setFooter({
						text: String(input.footer_text).slice(0, 2048),
						iconURL: input.footer_icon_url ? String(input.footer_icon_url) : undefined,
					})
				}
				if (input.timestamp) embed.setTimestamp(new Date())
				if (Array.isArray(input.fields)) {
					for (const f of (input.fields as Array<{ name: string; value: string; inline?: boolean }>).slice(0, 25)) {
						if (!f.name || !f.value) continue
						embed.addFields({
							name:   String(f.name).slice(0, 256),
							value:  String(f.value).slice(0, 1024),
							inline: !!f.inline,
						})
					}
				}

				let outsideContent: string | undefined = input.content ? String(input.content).slice(0, 1990) : undefined
				if (input.mention_role_id) {
					outsideContent = `<@&${input.mention_role_id}>${outsideContent ? "\n" + outsideContent : ""}`
				}

				const sent = await channel.send({
					content: outsideContent,
					embeds: [embed],
					allowedMentions: { roles: input.mention_role_id ? [String(input.mention_role_id)] : [] },
				})
				await logAuditEntry(guild, {
					actor, action: "send_embed", success: true,
					summary: `Posted embed in #${channel.name}`,
					target: `<#${channel.id}> (msg ${sent.id})`,
					after: { title: input.title, hasFields: Array.isArray(input.fields) && (input.fields as []).length > 0 },
				})
				return `Posted embed in #${channel.name} (message id ${sent.id}).`
			}

			/* ── SET_CHANNEL_TOPIC ── */
			case "set_channel_topic": {
				const channel = guild.channels.cache.get(String(input.channel_id || "")) as TextChannel | undefined
				if (!channel || channel.type !== ChannelType.GuildText) return "Error: text channel not found."
				const topic = String(input.topic || "").slice(0, 1024)
				const oldTopic = channel.topic
				await channel.setTopic(topic || null, `NightHawk-AI by ${actor.user.tag}`)
				await logAuditEntry(guild, {
					actor, action: "set_channel_topic", success: true,
					summary: `Set topic for #${channel.name}`,
					target: `<#${channel.id}>`,
					before: { topic: oldTopic }, after: { topic },
				})
				return `Updated topic for #${channel.name}.`
			}

			/* ── SET_CHANNEL_SLOWMODE ── */
			case "set_channel_slowmode": {
				const channel = guild.channels.cache.get(String(input.channel_id || "")) as TextChannel | undefined
				if (!channel || channel.type !== ChannelType.GuildText) return "Error: text channel not found."
				const seconds = Math.max(0, Math.min(21600, Math.floor(Number(input.seconds) || 0)))
				await channel.setRateLimitPerUser(seconds, `NightHawk-AI by ${actor.user.tag}`)
				await logAuditEntry(guild, {
					actor, action: "set_channel_slowmode", success: true,
					summary: `Slowmode on #${channel.name} → ${seconds}s`,
					target: `<#${channel.id}>`, after: { seconds },
				})
				return seconds === 0
					? `Slowmode disabled on #${channel.name}.`
					: `Slowmode set to ${seconds}s on #${channel.name}.`
			}

			/* ── PIN_MESSAGE ── */
			case "pin_message": {
				const channel = guild.channels.cache.get(String(input.channel_id || "")) as TextChannel | undefined
				if (!channel || channel.type !== ChannelType.GuildText) return "Error: text channel not found."
				const msg = await channel.messages.fetch(String(input.message_id || "")).catch(() => null)
				if (!msg) return "Error: message not found."
				await msg.pin(`NightHawk-AI by ${actor.user.tag}`)
				await logAuditEntry(guild, {
					actor, action: "pin_message", success: true,
					summary: `Pinned a message in #${channel.name}`,
					target: `<#${channel.id}> msg ${msg.id}`,
				})
				return `Pinned message in #${channel.name}.`
			}

			/* ── REACT_TO_MESSAGE ── */
			case "react_to_message": {
				const channel = guild.channels.cache.get(String(input.channel_id || "")) as TextChannel | undefined
				if (!channel || channel.type !== ChannelType.GuildText) return "Error: text channel not found."
				const msg = await channel.messages.fetch(String(input.message_id || "")).catch(() => null)
				if (!msg) return "Error: message not found."
				await msg.react(String(input.emoji || ""))
				return `Reacted with ${input.emoji} on msg ${msg.id} in #${channel.name}.`
			}

			/* ── CREATE_THREAD ── */
			case "create_thread": {
				const channel = guild.channels.cache.get(String(input.channel_id || "")) as TextChannel | undefined
				if (!channel || channel.type !== ChannelType.GuildText) return "Error: text channel not found."
				const name = String(input.name || "").slice(0, 100)
				if (!name) return "Error: thread name required."
				const autoArchive = Math.max(60, Math.min(10080, Math.floor(Number(input.auto_archive_minutes) || 1440)))
				let thread
				if (input.message_id) {
					const anchor = await channel.messages.fetch(String(input.message_id)).catch(() => null)
					if (!anchor) return "Error: anchor message not found."
					thread = await anchor.startThread({ name, autoArchiveDuration: autoArchive as 60 | 1440 | 4320 | 10080 })
				} else {
					thread = await channel.threads.create({ name, autoArchiveDuration: autoArchive as 60 | 1440 | 4320 | 10080 })
				}
				await logAuditEntry(guild, {
					actor, action: "create_thread", success: true,
					summary: `Created thread "${name}" in #${channel.name}`,
					target: `<#${thread.id}>`,
					after: { id: thread.id, name, autoArchive },
				})
				return `Created thread "${name}" (id ${thread.id}) in #${channel.name}.`
			}

			/* ── SET_NICKNAME ── */
			case "set_nickname": {
				const target = await guild.members.fetch(String(input.user_id || "")).catch(() => null)
				if (!target) return "Error: member not found."
				const me = guild.members.me
				if (!me) return "Error: bot member not resolvable."
				// Can't nickname someone with a higher role than the bot, and can't nickname the guild owner
				if (target.id === guild.ownerId) return "Error: cannot change the server owner's nickname."
				if (target.roles.highest.position >= me.roles.highest.position) {
					return `Error: cannot nickname ${target.user.tag} — their highest role is at/above the bot's.`
				}
				const nickname = String(input.nickname || "").slice(0, 32)
				const oldNick = target.nickname
				await target.setNickname(nickname || null, `NightHawk-AI by ${actor.user.tag}`)
				await logAuditEntry(guild, {
					actor, action: "set_nickname", success: true,
					summary: `Renamed ${target.user.tag} → ${nickname || "(reset)"}`,
					target: `<@${target.id}>`,
					before: { nickname: oldNick }, after: { nickname: nickname || null },
				})
				return `Nickname updated for ${target.user.tag}.`
			}

			default:
				return `Error: unknown content tool '${toolName}'`
		}
	} catch (e) {
		const err = e as Error
		await logAuditEntry(guild, {
			actor, action: toolName, success: false,
			summary: `'${toolName}' failed`, error: err.message,
		})
		return `Error: ${err.message}`
	}
}
