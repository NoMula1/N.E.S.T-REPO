/* ============================================================
   NightHawk AI — server-management tools
   Channels, categories, roles, permissions. Every destructive
   operation passes through requestConfirmation() + logAuditEntry().
   Hard limits prevent the bot from elevating roles above its own
   or touching @everyone / its own role.
============================================================ */
import {
	CategoryChannel,
	ChannelType,
	Colors,
	type Guild,
	type GuildBasedChannel,
	type GuildMember,
	type Message,
	OverwriteType,
	PermissionFlagsBits,
	type Role,
	TextChannel,
} from "discord.js"
import { logAuditEntry } from "../audit"
import { requestConfirmation } from "../confirm"

/* ─── Tool definitions for Claude (Anthropic JSON Schema) ─── */
export const SERVER_MGMT_TOOL_DEFINITIONS = [
	{
		name: "create_channel",
		description: "Create a new text or voice channel in the current server. Asks the user to confirm before creating.",
		input_schema: {
			type: "object",
			properties: {
				name: { type: "string", description: "Channel name (lowercase, hyphens; e.g. 'scam-alerts')" },
				type: { type: "string", enum: ["text", "voice"], description: "Channel type" },
				category_id: { type: "string", description: "Optional category ID to place the channel under" },
				topic: { type: "string", description: "Optional channel topic (text channels only)" },
			},
			required: ["name", "type"],
		},
	},
	{
		name: "rename_channel",
		description: "Rename an existing channel. Asks the user to confirm.",
		input_schema: {
			type: "object",
			properties: {
				channel_id: { type: "string", description: "ID of the channel to rename" },
				new_name: { type: "string", description: "New channel name" },
			},
			required: ["channel_id", "new_name"],
		},
	},
	{
		name: "move_channel",
		description: "Move a channel to a different category. Asks the user to confirm.",
		input_schema: {
			type: "object",
			properties: {
				channel_id: { type: "string", description: "ID of the channel to move" },
				new_category_id: { type: "string", description: "ID of the destination category, or empty string to remove from any category" },
			},
			required: ["channel_id", "new_category_id"],
		},
	},
	{
		name: "delete_channel",
		description: "Delete a channel. Destructive. Asks the user to confirm.",
		input_schema: {
			type: "object",
			properties: {
				channel_id: { type: "string", description: "ID of the channel to delete" },
				reason: { type: "string", description: "Why this channel is being deleted (logged to audit)" },
			},
			required: ["channel_id", "reason"],
		},
	},
	{
		name: "create_category",
		description: "Create a new category. Asks the user to confirm.",
		input_schema: {
			type: "object",
			properties: {
				name: { type: "string", description: "Category name" },
			},
			required: ["name"],
		},
	},
	{
		name: "create_role",
		description: "Create a new role. Asks the user to confirm. Cannot be created above the bot's own highest role.",
		input_schema: {
			type: "object",
			properties: {
				name: { type: "string", description: "Role name" },
				color: { type: "string", description: "Hex color like '#FF6B7A' (optional)" },
				hoist: { type: "boolean", description: "Display members with this role separately in the member list" },
				mentionable: { type: "boolean", description: "Allow @-mention of this role" },
			},
			required: ["name"],
		},
	},
	{
		name: "delete_role",
		description: "Delete a role. Destructive. Asks the user to confirm. Cannot delete @everyone or roles above the bot's highest role.",
		input_schema: {
			type: "object",
			properties: {
				role_id: { type: "string", description: "ID of the role to delete" },
				reason: { type: "string", description: "Why this role is being deleted (logged to audit)" },
			},
			required: ["role_id", "reason"],
		},
	},
	{
		name: "rename_role",
		description: "Rename an existing role. Asks the user to confirm.",
		input_schema: {
			type: "object",
			properties: {
				role_id: { type: "string", description: "ID of the role to rename" },
				new_name: { type: "string", description: "New role name" },
			},
			required: ["role_id", "new_name"],
		},
	},
	{
		name: "assign_role",
		description: "Give a role to a member. Asks the user to confirm.",
		input_schema: {
			type: "object",
			properties: {
				user_id: { type: "string", description: "Discord ID of the target member" },
				role_id: { type: "string", description: "ID of the role to assign" },
			},
			required: ["user_id", "role_id"],
		},
	},
	{
		name: "unassign_role",
		description: "Remove a role from a member. Asks the user to confirm.",
		input_schema: {
			type: "object",
			properties: {
				user_id: { type: "string", description: "Discord ID of the target member" },
				role_id: { type: "string", description: "ID of the role to remove" },
			},
			required: ["user_id", "role_id"],
		},
	},
	{
		name: "set_channel_permission",
		description: "Set a permission overwrite on a channel for a specific role (e.g. hide a channel from a role). Asks the user to confirm.",
		input_schema: {
			type: "object",
			properties: {
				channel_id: { type: "string", description: "ID of the channel" },
				role_id: { type: "string", description: "ID of the role to gate" },
				view: { type: "string", enum: ["allow", "deny", "default"], description: "View Channel permission" },
				send: { type: "string", enum: ["allow", "deny", "default"], description: "Send Messages permission" },
			},
			required: ["channel_id", "role_id"],
		},
	},
	{
		name: "list_server_structure",
		description: "List all channels, categories, and roles in the server. Read-only — no confirmation needed.",
		input_schema: { type: "object", properties: {} },
	},
]

/* ─── Helpers ────────────────────────────────────────────── */

function parseColor(hex: string | undefined): number | undefined {
	if (!hex) return undefined
	const cleaned = hex.replace(/^#/, "")
	if (!/^[0-9a-f]{6}$/i.test(cleaned)) return undefined
	return parseInt(cleaned, 16)
}

interface ExecContext {
	guild: Guild
	message: Message
	actor: GuildMember
}

function botCannotElevateAbove(guild: Guild, targetRole: Role): boolean {
	const me = guild.members.me
	if (!me) return true
	return targetRole.position >= me.roles.highest.position
}

/* ─── Tool dispatch ──────────────────────────────────────── */

export async function executeServerMgmtTool(
	toolName: string,
	input: Record<string, unknown>,
	ctx: ExecContext,
): Promise<string> {
	const { guild, message, actor } = ctx

	try {
		switch (toolName) {

			/* ── CREATE_CHANNEL ── */
			case "create_channel": {
				const name = String(input.name || "").trim().toLowerCase().replace(/\s+/g, "-")
				const type = input.type === "voice" ? ChannelType.GuildVoice : ChannelType.GuildText
				const parent = input.category_id ? String(input.category_id) : undefined
				const topic = input.topic ? String(input.topic) : undefined

				if (!name) return "Error: channel name is required."

				const confirm = await requestConfirmation(message, `Create ${type === ChannelType.GuildVoice ? "voice" : "text"} channel #${name}`, [
					...(parent ? [`Under category: <#${parent}>`] : ["No parent category"]),
					...(topic ? [`Topic: ${topic}`] : []),
				])
				if (!confirm.approved) return `User canceled (${confirm.reason}). Channel NOT created.`

				const created = await guild.channels.create({
					name,
					type,
					parent: parent || undefined,
					topic,
				})
				await logAuditEntry(guild, {
					actor, action: "create_channel", success: true,
					summary: `Created ${type === ChannelType.GuildVoice ? "voice" : "text"} channel #${name}`,
					target: `<#${created.id}>`,
					after: { id: created.id, name, type: type === ChannelType.GuildVoice ? "voice" : "text", parent },
				})
				return `Created channel #${name} (id: ${created.id})`
			}

			/* ── RENAME_CHANNEL ── */
			case "rename_channel": {
				const channelId = String(input.channel_id || "")
				const newName = String(input.new_name || "").trim()
				const channel = guild.channels.cache.get(channelId)
				if (!channel) return `Error: channel ${channelId} not found.`
				if (!newName) return "Error: new name is required."

				const oldName = channel.name
				const confirm = await requestConfirmation(message, `Rename channel <#${channelId}>`, [
					`From: \`#${oldName}\``,
					`To:   \`#${newName}\``,
				])
				if (!confirm.approved) return `User canceled (${confirm.reason}). Channel NOT renamed.`

				await (channel as TextChannel).setName(newName)
				await logAuditEntry(guild, {
					actor, action: "rename_channel", success: true,
					summary: `Renamed #${oldName} → #${newName}`,
					target: `<#${channelId}>`,
					before: { name: oldName }, after: { name: newName },
				})
				return `Renamed channel to #${newName}`
			}

			/* ── MOVE_CHANNEL ── */
			case "move_channel": {
				const channelId = String(input.channel_id || "")
				const newCategoryId = String(input.new_category_id || "")
				const channel = guild.channels.cache.get(channelId) as GuildBasedChannel | undefined
				if (!channel || !("setParent" in channel)) return `Error: channel ${channelId} not found or not movable.`

				const oldParent = channel.parentId
				const confirm = await requestConfirmation(message, `Move <#${channelId}>`, [
					oldParent ? `From category: <#${oldParent}>` : "From: no category",
					newCategoryId ? `To category: <#${newCategoryId}>` : "To: no category (top-level)",
				])
				if (!confirm.approved) return `User canceled (${confirm.reason}). Channel NOT moved.`

				await channel.setParent(newCategoryId || null, { lockPermissions: false })
				await logAuditEntry(guild, {
					actor, action: "move_channel", success: true,
					summary: `Moved <#${channelId}>`,
					target: `<#${channelId}>`,
					before: { parent: oldParent }, after: { parent: newCategoryId || null },
				})
				return `Moved channel.`
			}

			/* ── DELETE_CHANNEL ── */
			case "delete_channel": {
				const channelId = String(input.channel_id || "")
				const reason = String(input.reason || "no reason provided")
				const channel = guild.channels.cache.get(channelId)
				if (!channel) return `Error: channel ${channelId} not found.`

				if (channel.id === message.channelId) {
					return "Error: refusing to delete the channel this conversation is happening in."
				}

				const confirm = await requestConfirmation(message, `🗑️ DELETE channel #${channel.name}`, [
					`Channel: <#${channelId}>`,
					`Reason: ${reason}`,
					"⚠️ This cannot be undone.",
				])
				if (!confirm.approved) return `User canceled (${confirm.reason}). Channel NOT deleted.`

				const oldName = channel.name
				await channel.delete(`NightHawk-AI by ${actor.user.tag}: ${reason}`)
				await logAuditEntry(guild, {
					actor, action: "delete_channel", success: true,
					summary: `Deleted #${oldName}`,
					target: `\`${oldName}\` (id ${channelId})`,
					before: { id: channelId, name: oldName }, after: { deleted: true },
				})
				return `Deleted channel #${oldName}.`
			}

			/* ── CREATE_CATEGORY ── */
			case "create_category": {
				const name = String(input.name || "").trim()
				if (!name) return "Error: category name is required."

				const confirm = await requestConfirmation(message, `Create category "${name}"`, [
					"Position: end of the channel list",
				])
				if (!confirm.approved) return `User canceled (${confirm.reason}). Category NOT created.`

				const created = await guild.channels.create({
					name,
					type: ChannelType.GuildCategory,
				}) as CategoryChannel
				await logAuditEntry(guild, {
					actor, action: "create_category", success: true,
					summary: `Created category "${name}"`,
					target: `<#${created.id}>`,
					after: { id: created.id, name },
				})
				return `Created category ${name} (id: ${created.id})`
			}

			/* ── CREATE_ROLE ── */
			case "create_role": {
				const name = String(input.name || "").trim()
				if (!name) return "Error: role name is required."
				const color = parseColor(input.color as string | undefined)
				const hoist = !!input.hoist
				const mentionable = !!input.mentionable

				const confirm = await requestConfirmation(message, `Create role @${name}`, [
					color ? `Color: \`${input.color}\`` : "Color: default",
					`Hoisted: ${hoist ? "yes" : "no"}`,
					`Mentionable: ${mentionable ? "yes" : "no"}`,
				])
				if (!confirm.approved) return `User canceled (${confirm.reason}). Role NOT created.`

				const created = await guild.roles.create({
					name, color, hoist, mentionable,
					reason: `NightHawk-AI by ${actor.user.tag}`,
				})
				await logAuditEntry(guild, {
					actor, action: "create_role", success: true,
					summary: `Created role @${name}`,
					target: `<@&${created.id}>`,
					after: { id: created.id, name, color: input.color, hoist, mentionable },
				})
				return `Created role @${name} (id: ${created.id})`
			}

			/* ── DELETE_ROLE ── */
			case "delete_role": {
				const roleId = String(input.role_id || "")
				const reason = String(input.reason || "no reason provided")
				const role = guild.roles.cache.get(roleId)
				if (!role) return `Error: role ${roleId} not found.`
				if (role.id === guild.id) return "Error: refusing to delete @everyone."
				if (role.managed) return `Error: refusing to delete a managed role (${role.name}) — managed roles are controlled by integrations.`
				if (botCannotElevateAbove(guild, role)) {
					return `Error: cannot delete role @${role.name} — it's positioned at or above the bot's highest role.`
				}

				const confirm = await requestConfirmation(message, `🗑️ DELETE role @${role.name}`, [
					`Role: <@&${roleId}>`,
					`Reason: ${reason}`,
					`Currently held by ${role.members.size} member${role.members.size === 1 ? "" : "s"}`,
					"⚠️ This cannot be undone.",
				])
				if (!confirm.approved) return `User canceled (${confirm.reason}). Role NOT deleted.`

				const oldName = role.name
				await role.delete(`NightHawk-AI by ${actor.user.tag}: ${reason}`)
				await logAuditEntry(guild, {
					actor, action: "delete_role", success: true,
					summary: `Deleted role @${oldName}`,
					target: `\`${oldName}\` (id ${roleId})`,
					before: { id: roleId, name: oldName }, after: { deleted: true },
				})
				return `Deleted role @${oldName}.`
			}

			/* ── RENAME_ROLE ── */
			case "rename_role": {
				const roleId = String(input.role_id || "")
				const newName = String(input.new_name || "").trim()
				const role = guild.roles.cache.get(roleId)
				if (!role) return `Error: role ${roleId} not found.`
				if (!newName) return "Error: new name is required."
				if (botCannotElevateAbove(guild, role)) {
					return `Error: cannot rename role @${role.name} — it's at or above the bot's highest role.`
				}

				const oldName = role.name
				const confirm = await requestConfirmation(message, `Rename role <@&${roleId}>`, [
					`From: \`@${oldName}\``,
					`To:   \`@${newName}\``,
				])
				if (!confirm.approved) return `User canceled (${confirm.reason}). Role NOT renamed.`

				await role.edit({ name: newName })
				await logAuditEntry(guild, {
					actor, action: "rename_role", success: true,
					summary: `Renamed role @${oldName} → @${newName}`,
					target: `<@&${roleId}>`,
					before: { name: oldName }, after: { name: newName },
				})
				return `Renamed role to @${newName}`
			}

			/* ── ASSIGN_ROLE ── */
			case "assign_role": {
				const userId = String(input.user_id || "")
				const roleId = String(input.role_id || "")
				const target = await guild.members.fetch(userId).catch(() => null)
				if (!target) return `Error: member ${userId} not found.`
				const role = guild.roles.cache.get(roleId)
				if (!role) return `Error: role ${roleId} not found.`
				if (botCannotElevateAbove(guild, role)) {
					return `Error: cannot assign role @${role.name} — it's at or above the bot's highest role.`
				}

				if (target.roles.cache.has(roleId)) {
					return `${target.user.tag} already has @${role.name}.`
				}

				const confirm = await requestConfirmation(message, `Give @${role.name} to <@${userId}>`, [
					`Member: ${target.user.tag} (<@${userId}>)`,
					`Role: <@&${roleId}>`,
				])
				if (!confirm.approved) return `User canceled (${confirm.reason}). Role NOT assigned.`

				await target.roles.add(role, `NightHawk-AI by ${actor.user.tag}`)
				await logAuditEntry(guild, {
					actor, action: "assign_role", success: true,
					summary: `Gave @${role.name} to ${target.user.tag}`,
					target: `<@${userId}>`,
				})
				return `Gave @${role.name} to ${target.user.tag}.`
			}

			/* ── UNASSIGN_ROLE ── */
			case "unassign_role": {
				const userId = String(input.user_id || "")
				const roleId = String(input.role_id || "")
				const target = await guild.members.fetch(userId).catch(() => null)
				if (!target) return `Error: member ${userId} not found.`
				const role = guild.roles.cache.get(roleId)
				if (!role) return `Error: role ${roleId} not found.`
				if (botCannotElevateAbove(guild, role)) {
					return `Error: cannot manage role @${role.name} — it's at or above the bot's highest role.`
				}

				if (!target.roles.cache.has(roleId)) {
					return `${target.user.tag} doesn't have @${role.name}.`
				}

				const confirm = await requestConfirmation(message, `Remove @${role.name} from <@${userId}>`, [
					`Member: ${target.user.tag} (<@${userId}>)`,
					`Role: <@&${roleId}>`,
				])
				if (!confirm.approved) return `User canceled (${confirm.reason}). Role NOT removed.`

				await target.roles.remove(role, `NightHawk-AI by ${actor.user.tag}`)
				await logAuditEntry(guild, {
					actor, action: "unassign_role", success: true,
					summary: `Removed @${role.name} from ${target.user.tag}`,
					target: `<@${userId}>`,
				})
				return `Removed @${role.name} from ${target.user.tag}.`
			}

			/* ── SET_CHANNEL_PERMISSION ── */
			case "set_channel_permission": {
				const channelId = String(input.channel_id || "")
				const roleId = String(input.role_id || "")
				const channel = guild.channels.cache.get(channelId) as TextChannel | undefined
				if (!channel || !("permissionOverwrites" in channel)) return `Error: channel ${channelId} not found.`
				const role = guild.roles.cache.get(roleId)
				if (!role) return `Error: role ${roleId} not found.`

				const view = input.view as string | undefined
				const send = input.send as string | undefined

				const overwrites: { allow: bigint[]; deny: bigint[] } = { allow: [], deny: [] }
				const summaryLines: string[] = []
				if (view === "allow")  { overwrites.allow.push(PermissionFlagsBits.ViewChannel);  summaryLines.push("View Channel: allow") }
				if (view === "deny")   { overwrites.deny.push(PermissionFlagsBits.ViewChannel);   summaryLines.push("View Channel: deny") }
				if (send === "allow")  { overwrites.allow.push(PermissionFlagsBits.SendMessages); summaryLines.push("Send Messages: allow") }
				if (send === "deny")   { overwrites.deny.push(PermissionFlagsBits.SendMessages);  summaryLines.push("Send Messages: deny") }

				if (overwrites.allow.length === 0 && overwrites.deny.length === 0 && view !== "default" && send !== "default") {
					return "Error: no permission changes specified."
				}

				const confirm = await requestConfirmation(message, `Set permissions on <#${channelId}>`, [
					`Role: <@&${roleId}>`,
					...summaryLines,
					...(view === "default" || send === "default" ? ["(any field set to 'default' will clear that overwrite)"] : []),
				])
				if (!confirm.approved) return `User canceled (${confirm.reason}). Permissions NOT changed.`

				if (view === "default" && send === "default") {
					await channel.permissionOverwrites.delete(role, `NightHawk-AI by ${actor.user.tag}`)
				} else {
					await channel.permissionOverwrites.edit(role, {
						ViewChannel:  view === "allow" ? true : view === "deny" ? false : null,
						SendMessages: send === "allow" ? true : send === "deny" ? false : null,
					}, { type: OverwriteType.Role, reason: `NightHawk-AI by ${actor.user.tag}` })
				}

				await logAuditEntry(guild, {
					actor, action: "set_channel_permission", success: true,
					summary: `Set perms on <#${channelId}> for @${role.name}`,
					target: `<#${channelId}>`,
					after: { view, send },
				})
				return `Updated permissions on <#${channelId}> for @${role.name}.`
			}

			/* ── LIST_SERVER_STRUCTURE ── (read-only, no confirmation) ── */
			case "list_server_structure": {
				const channels = guild.channels.cache.map(c => ({
					id: c.id, name: c.name,
					type: c.type === ChannelType.GuildText ? "text" :
						c.type === ChannelType.GuildVoice ? "voice" :
						c.type === ChannelType.GuildCategory ? "category" :
						"other",
					parent: c.parentId,
				}))
				const roles = guild.roles.cache.map(r => ({
					id: r.id, name: r.name, position: r.position, color: r.hexColor,
					memberCount: r.members.size, managed: r.managed,
				})).sort((a, b) => b.position - a.position)

				return JSON.stringify({ channels, roles }, null, 2).slice(0, 8000)
			}

			default:
				return `Error: unknown tool '${toolName}'`
		}
	} catch (e) {
		const err = e as Error
		await logAuditEntry(guild, {
			actor, action: toolName, success: false,
			summary: `Tool '${toolName}' failed`,
			error: err.message,
		})
		return `Error: ${err.message}`
	}
}
