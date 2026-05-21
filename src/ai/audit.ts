/* ============================================================
   NightHawk AI — audit logger
   Every AI-driven server change posts a record to #nh-ai-audit.
   Auto-creates the channel under the first available category if
   it doesn't exist. Falls back to console log on failure.
============================================================ */
import {
	ChannelType,
	Guild,
	TextChannel,
	PermissionFlagsBits,
	EmbedBuilder,
	type GuildMember,
} from "discord.js"
import { Log } from "../utils/logging"

const AUDIT_CHANNEL_NAME = "nh-ai-audit"

/** Find or create the audit channel for this guild. */
async function getAuditChannel(guild: Guild): Promise<TextChannel | null> {
	// Try to find by name
	const existing = guild.channels.cache.find(
		c => c.type === ChannelType.GuildText && c.name === AUDIT_CHANNEL_NAME,
	) as TextChannel | undefined
	if (existing) return existing

	// Try to create. Needs ManageChannels.
	const me = guild.members.me
	if (!me || !me.permissions.has(PermissionFlagsBits.ManageChannels)) {
		Log.warn(`[NightHawk-AI/audit] cannot create #${AUDIT_CHANNEL_NAME} — missing ManageChannels`)
		return null
	}
	try {
		const created = await guild.channels.create({
			name: AUDIT_CHANNEL_NAME,
			type: ChannelType.GuildText,
			topic: "NightHawk-AI audit log — every server change made by the AI is recorded here.",
			permissionOverwrites: [
				{
					id: guild.roles.everyone.id,
					deny: [PermissionFlagsBits.SendMessages],
				},
			],
		})
		Log.info(`[NightHawk-AI/audit] created #${AUDIT_CHANNEL_NAME}`)
		return created as TextChannel
	} catch (e) {
		Log.error(`[NightHawk-AI/audit] failed to create #${AUDIT_CHANNEL_NAME}: ${(e as Error).message}`)
		return null
	}
}

export interface AuditEntry {
	actor: GuildMember
	action: string                   // e.g. "create_channel", "delete_role"
	summary: string                  // human-readable: "Created text channel #scam-alerts"
	target?: string                  // optional resource label
	before?: Record<string, unknown> // optional snapshot of pre-change state
	after?: Record<string, unknown>  // optional snapshot of post-change state
	success: boolean
	error?: string
}

/** Post an audit record to #nh-ai-audit. Non-fatal on failure. */
export async function logAuditEntry(guild: Guild, entry: AuditEntry): Promise<void> {
	try {
		const channel = await getAuditChannel(guild)
		if (!channel) {
			Log.info(`[NightHawk-AI/audit] (no channel) ${entry.action} by ${entry.actor.user.tag}: ${entry.summary}`)
			return
		}

		const color = entry.success ? 0x27AE60 : 0xE63946
		const icon = entry.success ? "✓" : "✗"

		const embed = new EmbedBuilder()
			.setColor(color)
			.setTitle(`${icon} ${entry.action}`)
			.setDescription(entry.summary)
			.addFields(
				{ name: "Actor", value: `<@${entry.actor.id}>\n\`${entry.actor.user.tag}\``, inline: true },
				...(entry.target ? [{ name: "Target", value: entry.target, inline: true }] : []),
			)
			.setTimestamp(new Date())
			.setFooter({ text: "NightHawk-AI · server-management audit" })

		if (entry.error) {
			embed.addFields({ name: "Error", value: "```" + entry.error.slice(0, 1000) + "```" })
		}
		if (entry.before) {
			embed.addFields({ name: "Before", value: "```json\n" + JSON.stringify(entry.before, null, 2).slice(0, 900) + "\n```" })
		}
		if (entry.after) {
			embed.addFields({ name: "After", value: "```json\n" + JSON.stringify(entry.after, null, 2).slice(0, 900) + "\n```" })
		}

		await channel.send({ embeds: [embed] }).catch(e => {
			Log.warn(`[NightHawk-AI/audit] send failed: ${(e as Error).message}`)
		})
	} catch (e) {
		Log.error(`[NightHawk-AI/audit] unexpected: ${(e as Error).message}`)
	}
}
