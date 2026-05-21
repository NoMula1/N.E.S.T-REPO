/* ============================================================
   Automod — alert channel logging.
   Posts a single embed when a rule fires, with actor / rule /
   message snippet / action taken. Auto-creates the configured
   alert channel if it doesn't exist yet.
============================================================ */
import {
	ChannelType,
	EmbedBuilder,
	type Guild,
	type Message,
	PermissionFlagsBits,
	TextChannel,
} from "discord.js"
import GuildConfigModel, { type GuildConfig } from "../schemas/GuildConfig"
import { Log } from "../utils/logging"

const DEFAULT_CHANNEL_NAME = "nh-automod-alerts"

async function getOrCreateAlertChannel(guild: Guild, cfg: GuildConfig): Promise<TextChannel | null> {
	const configured = cfg.automod?.alertChannelId
	if (configured) {
		const ch = guild.channels.cache.get(configured)
		if (ch && ch.type === ChannelType.GuildText) return ch as TextChannel
	}

	// Look for an existing default channel
	const byName = guild.channels.cache.find(
		c => c.type === ChannelType.GuildText && c.name === DEFAULT_CHANNEL_NAME,
	) as TextChannel | undefined
	if (byName) {
		// Persist the discovery so we don't search next time
		await GuildConfigModel.updateOne(
			{ guildId: guild.id },
			{ $set: { "automod.alertChannelId": byName.id } },
		).catch(() => { })
		return byName
	}

	// Create it (needs ManageChannels)
	const me = guild.members.me
	if (!me || !me.permissions.has(PermissionFlagsBits.ManageChannels)) {
		Log.warn(`[automod] cannot create #${DEFAULT_CHANNEL_NAME} — missing ManageChannels`)
		return null
	}
	try {
		const created = await guild.channels.create({
			name: DEFAULT_CHANNEL_NAME,
			type: ChannelType.GuildText,
			topic: "NightHawk automod alerts — every Layer 1/2 hit lands here.",
			permissionOverwrites: [
				{
					id: guild.roles.everyone.id,
					deny: [PermissionFlagsBits.SendMessages],
				},
			],
		})
		await GuildConfigModel.updateOne(
			{ guildId: guild.id },
			{ $set: { "automod.alertChannelId": created.id } },
		).catch(() => { })
		Log.info(`[automod] created #${DEFAULT_CHANNEL_NAME}`)
		return created as TextChannel
	} catch (e) {
		Log.error(`[automod] create channel failed: ${(e as Error).message}`)
		return null
	}
}

export interface AlertOptions {
	moduleName: string         // e.g. "Mass Mention Guard"
	reason: string             // human-readable explanation
	action: string             // 'alert' | 'deleted' | 'deleted + timed out 10m'
	message: Message           // the offending message
	severity?: 'low' | 'medium' | 'high'
	extra?: Record<string, unknown>
}

export async function postAlert(guild: Guild, cfg: GuildConfig, opts: AlertOptions): Promise<void> {
	const channel = await getOrCreateAlertChannel(guild, cfg)
	if (!channel) return

	const severityColor =
		opts.severity === "high"   ? 0xE63946 :
		opts.severity === "medium" ? 0xE67E22 :
		                             0xFF6B7A

	const embed = new EmbedBuilder()
		.setColor(severityColor)
		.setTitle(`🚨 ${opts.moduleName}`)
		.setDescription(opts.reason)
		.addFields(
			{
				name: "Member",
				value: `<@${opts.message.author.id}>\n\`${opts.message.author.tag}\`\nID: \`${opts.message.author.id}\``,
				inline: true,
			},
			{
				name: "Channel",
				value: `<#${opts.message.channelId}>`,
				inline: true,
			},
			{
				name: "Action taken",
				value: opts.action,
				inline: true,
			},
			{
				name: "Message",
				value: (opts.message.content || "*(no text — attachment / embed)*").slice(0, 1000),
			},
		)
		.setTimestamp(new Date())
		.setFooter({ text: "NightHawk automod" })

	if (opts.extra) {
		const extraStr = "```json\n" + JSON.stringify(opts.extra, null, 2).slice(0, 900) + "\n```"
		embed.addFields({ name: "Detail", value: extraStr })
	}

	await channel.send({ embeds: [embed] }).catch(e => {
		Log.warn(`[automod] alert post failed: ${(e as Error).message}`)
	})
}
