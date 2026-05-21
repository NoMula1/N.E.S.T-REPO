/* ============================================================
   NightHawk AI — moderation tools.
   ALL operations in this module are destructive and gated by the
   button-based Confirm/Cancel flow before executing.
============================================================ */
import {
	ChannelType,
	type Guild,
	type GuildMember,
	type Message,
	TextChannel,
} from "discord.js"
import { logAuditEntry } from "../audit"
import { requestConfirmation } from "../confirm"

export const MODERATION_TOOL_DEFINITIONS = [
	{
		name: "kick_member",
		description: "Kick a member from the server. Destructive. Asks the user to confirm.",
		input_schema: {
			type: "object",
			properties: {
				user_id: { type: "string", description: "Discord ID of the member" },
				reason: { type: "string", description: "Reason for the kick (shown in audit)" },
			},
			required: ["user_id", "reason"],
		},
	},
	{
		name: "ban_member",
		description: "Ban a member from the server. Destructive. Asks the user to confirm. Optionally deletes their recent messages.",
		input_schema: {
			type: "object",
			properties: {
				user_id: { type: "string", description: "Discord ID of the member" },
				reason: { type: "string", description: "Reason for the ban" },
				delete_message_days: { type: "number", description: "Also purge their messages from the last N days (0-7, default 0)" },
			},
			required: ["user_id", "reason"],
		},
	},
	{
		name: "unban_member",
		description: "Lift a ban from a user. Asks the user to confirm.",
		input_schema: {
			type: "object",
			properties: {
				user_id: { type: "string", description: "Discord ID of the banned user" },
				reason: { type: "string", description: "Reason for lifting the ban" },
			},
			required: ["user_id", "reason"],
		},
	},
	{
		name: "timeout_member",
		description: "Time-out a member (Discord Communication Disabled). They can't send messages or react until the timeout expires. Max 28 days.",
		input_schema: {
			type: "object",
			properties: {
				user_id: { type: "string", description: "Discord ID of the member" },
				minutes: { type: "number", description: "Length in minutes (1 - 40320 / 28 days)" },
				reason: { type: "string", description: "Reason for the timeout" },
			},
			required: ["user_id", "minutes", "reason"],
		},
	},
	{
		name: "untimeout_member",
		description: "Lift an active timeout from a member.",
		input_schema: {
			type: "object",
			properties: {
				user_id: { type: "string", description: "Discord ID of the member" },
			},
			required: ["user_id"],
		},
	},
	{
		name: "purge_messages",
		description: "Bulk delete the last N messages from a channel (1-100). Discord limit: cannot delete messages older than 14 days. Destructive — asks the user to confirm.",
		input_schema: {
			type: "object",
			properties: {
				channel_id: { type: "string", description: "Channel to purge" },
				count: { type: "number", description: "Number of recent messages to delete (1-100)" },
				reason: { type: "string", description: "Why this is happening (audit)" },
			},
			required: ["channel_id", "count", "reason"],
		},
	},
]

interface ExecContext {
	guild: Guild
	message: Message
	actor: GuildMember
}

export async function executeModerationTool(
	toolName: string,
	input: Record<string, unknown>,
	ctx: ExecContext,
): Promise<string> {
	const { guild, message, actor } = ctx
	const me = guild.members.me
	if (!me) return "Error: bot member not resolvable."

	try {
		switch (toolName) {

			/* ── KICK_MEMBER ── */
			case "kick_member": {
				const target = await guild.members.fetch(String(input.user_id || "")).catch(() => null)
				if (!target) return "Error: member not found."
				if (target.id === guild.ownerId) return "Error: refusing to kick the server owner."
				if (target.id === me.id) return "Error: refusing to kick myself."
				if (target.roles.highest.position >= me.roles.highest.position) {
					return `Error: cannot kick ${target.user.tag} — their role is at/above the bot's.`
				}
				const reason = String(input.reason || "no reason provided")

				const confirm = await requestConfirmation(message, `🦶 KICK ${target.user.tag}`, [
					`Member: <@${target.id}>`,
					`Reason: ${reason}`,
					"They'll be removed from the server but can rejoin if they have an invite.",
				])
				if (!confirm.approved) return `User canceled (${confirm.reason}). Kick NOT executed.`

				await target.kick(`NightHawk-AI by ${actor.user.tag}: ${reason}`)
				await logAuditEntry(guild, {
					actor, action: "kick_member", success: true,
					summary: `Kicked ${target.user.tag}`,
					target: `<@${target.id}>`,
					before: { reason },
				})
				return `Kicked ${target.user.tag}.`
			}

			/* ── BAN_MEMBER ── */
			case "ban_member": {
				const userId = String(input.user_id || "")
				const reason = String(input.reason || "no reason provided")
				const deleteDays = Math.max(0, Math.min(7, Math.floor(Number(input.delete_message_days) || 0)))

				const target = await guild.members.fetch(userId).catch(() => null)
				if (target) {
					if (target.id === guild.ownerId) return "Error: refusing to ban the server owner."
					if (target.id === me.id) return "Error: refusing to ban myself."
					if (target.roles.highest.position >= me.roles.highest.position) {
						return `Error: cannot ban ${target.user.tag} — their role is at/above the bot's.`
					}
				}
				const displayName = target ? target.user.tag : `user ${userId}`

				const confirm = await requestConfirmation(message, `🔨 BAN ${displayName}`, [
					`User: <@${userId}>`,
					`Reason: ${reason}`,
					deleteDays > 0 ? `Will also delete their messages from the last ${deleteDays} day${deleteDays === 1 ? "" : "s"}.` : "Will NOT delete their past messages.",
					"⚠️ They cannot rejoin unless unbanned.",
				])
				if (!confirm.approved) return `User canceled (${confirm.reason}). Ban NOT executed.`

				await guild.members.ban(userId, {
					reason: `NightHawk-AI by ${actor.user.tag}: ${reason}`,
					deleteMessageSeconds: deleteDays * 86400,
				})
				await logAuditEntry(guild, {
					actor, action: "ban_member", success: true,
					summary: `Banned ${displayName}`,
					target: `<@${userId}>`,
					before: { reason, deleteDays },
				})
				return `Banned ${displayName}.`
			}

			/* ── UNBAN_MEMBER ── */
			case "unban_member": {
				const userId = String(input.user_id || "")
				const reason = String(input.reason || "no reason provided")

				const ban = await guild.bans.fetch(userId).catch(() => null)
				if (!ban) return `Error: ${userId} is not currently banned.`

				const confirm = await requestConfirmation(message, `Unban ${ban.user.tag}`, [
					`User: <@${userId}>`,
					`Reason: ${reason}`,
				])
				if (!confirm.approved) return `User canceled (${confirm.reason}). Unban NOT executed.`

				await guild.bans.remove(userId, `NightHawk-AI by ${actor.user.tag}: ${reason}`)
				await logAuditEntry(guild, {
					actor, action: "unban_member", success: true,
					summary: `Unbanned ${ban.user.tag}`,
					target: `<@${userId}>`,
				})
				return `Unbanned ${ban.user.tag}.`
			}

			/* ── TIMEOUT_MEMBER ── */
			case "timeout_member": {
				const target = await guild.members.fetch(String(input.user_id || "")).catch(() => null)
				if (!target) return "Error: member not found."
				if (target.id === guild.ownerId) return "Error: refusing to timeout the server owner."
				if (target.id === me.id) return "Error: refusing to timeout myself."
				if (target.roles.highest.position >= me.roles.highest.position) {
					return `Error: cannot timeout ${target.user.tag} — their role is at/above the bot's.`
				}
				const minutes = Math.max(1, Math.min(40320, Math.floor(Number(input.minutes) || 5)))
				const reason = String(input.reason || "no reason provided")
				const ms = minutes * 60 * 1000

				const confirm = await requestConfirmation(message, `⏱️ Timeout ${target.user.tag} for ${minutes} min`, [
					`Member: <@${target.id}>`,
					`Duration: ${minutes} minute${minutes === 1 ? "" : "s"}`,
					`Reason: ${reason}`,
					"They can't send messages or react until expiration.",
				])
				if (!confirm.approved) return `User canceled (${confirm.reason}). Timeout NOT executed.`

				await target.timeout(ms, `NightHawk-AI by ${actor.user.tag}: ${reason}`)
				await logAuditEntry(guild, {
					actor, action: "timeout_member", success: true,
					summary: `Timed out ${target.user.tag} for ${minutes}m`,
					target: `<@${target.id}>`,
					after: { minutes, expiresAt: new Date(Date.now() + ms).toISOString() },
				})
				return `${target.user.tag} timed out for ${minutes} min.`
			}

			/* ── UNTIMEOUT_MEMBER ── */
			case "untimeout_member": {
				const target = await guild.members.fetch(String(input.user_id || "")).catch(() => null)
				if (!target) return "Error: member not found."
				if (!target.communicationDisabledUntil) return `${target.user.tag} is not currently timed out.`

				await target.timeout(null, `NightHawk-AI by ${actor.user.tag}: timeout lifted`)
				await logAuditEntry(guild, {
					actor, action: "untimeout_member", success: true,
					summary: `Lifted timeout on ${target.user.tag}`,
					target: `<@${target.id}>`,
				})
				return `Lifted timeout on ${target.user.tag}.`
			}

			/* ── PURGE_MESSAGES ── */
			case "purge_messages": {
				const channel = guild.channels.cache.get(String(input.channel_id || "")) as TextChannel | undefined
				if (!channel || channel.type !== ChannelType.GuildText) return "Error: text channel not found."
				const count = Math.max(1, Math.min(100, Math.floor(Number(input.count) || 0)))
				const reason = String(input.reason || "no reason provided")

				const confirm = await requestConfirmation(message, `🧹 PURGE ${count} messages from #${channel.name}`, [
					`Channel: <#${channel.id}>`,
					`Count: ${count}`,
					`Reason: ${reason}`,
					"⚠️ Discord cannot delete messages older than 14 days — some may be skipped.",
				])
				if (!confirm.approved) return `User canceled (${confirm.reason}). Purge NOT executed.`

				const deleted = await channel.bulkDelete(count, true).catch(e => {
					throw new Error(`bulkDelete failed: ${(e as Error).message}`)
				})
				await logAuditEntry(guild, {
					actor, action: "purge_messages", success: true,
					summary: `Purged ${deleted.size} messages from #${channel.name}`,
					target: `<#${channel.id}>`,
					before: { reason, requested: count }, after: { actuallyDeleted: deleted.size },
				})
				return `Deleted ${deleted.size} messages from #${channel.name}.`
			}

			default:
				return `Error: unknown moderation tool '${toolName}'`
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
