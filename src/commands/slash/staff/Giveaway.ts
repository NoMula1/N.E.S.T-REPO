import { PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import Giveaway from "../../../schemas/Giveaway"
import ScheduledTask from "../../../schemas/ScheduledTask"
import { parseDurationToMs } from "../../../utils/giveawayUtils"
import { Log } from "../../../utils/logging"

export default new CommandExecutor()
	.setName("giveaway")
	.setDescription("Create a giveaway (staff)")
	.setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
	.setBasePermission({ Level: PermissionLevel.Staff })
	.addStringOption(opt => opt.setName("title").setDescription("Giveaway title").setRequired(true))
	.addStringOption(opt => opt.setName("description").setDescription("Optional description").setRequired(false))
	.addStringOption(opt => opt.setName("duration").setDescription("Duration like 30m, 1h, 2d").setRequired(true))
	.addIntegerOption(opt => opt.setName("winners").setDescription("How many winners").setRequired(true))
	.addRoleOption(opt => opt.setName("required_role").setDescription("Role required to enter the giveaway").setRequired(false))
	.addChannelOption(opt => opt.setName("channel").setDescription("Channel to post giveaway in").addChannelTypes(ChannelType.GuildText).setRequired(false))
	.setExecutor(async interaction => {
		if (!interaction.inCachedGuild()) {
			await interaction.reply({ content: "Run this inside a server.", ephemeral: true })
			return
		}

		const guild = interaction.guild!
		const host = interaction.user
		const title = interaction.options.getString("title", true)
		const description = interaction.options.getString("description", false) ?? undefined
		const durationStr = interaction.options.getString("duration", true)
		const winners = Math.max(1, Math.min(50, interaction.options.getInteger("winners", true) || 1))
		const requiredRole = interaction.options.getRole("required_role", false)
		const channel = interaction.options.getChannel("channel", false) ?? interaction.channel!

		const ms = parseDurationToMs(durationStr)
		if (!ms || ms < 5_000) {
			await interaction.reply({ content: "Invalid duration — use formats like 30m, 1h, 2d (minimum 5s).", ephemeral: true })
			return
		}
		const endsAt = new Date(Date.now() + ms)

		// Create giveaway entry
		const doc = await Giveaway.create({
			guildId: guild.id,
			channelId: String(channel.id),
			hostId: host.id,
			title,
			description,
			endsAt,
			winnersCount: winners,
			requiredRoleId: requiredRole ? requiredRole.id : null,
			entrants: [],
			status: "active"
		})

		// Build embed + button
		const embed = new EmbedBuilder()
			.setTitle(title)
			.setDescription(description ?? "\u200b")
			.addFields(
				{ name: "Ends", value: `${endsAt.toISOString()} (UTC)`, inline: true },
				{ name: "Winners", value: String(winners), inline: true },
				{ name: "Required Role", value: requiredRole ? `<@&${requiredRole.id}>` : "None", inline: true },
			)
			.setFooter({ text: `Giveaway ID: ${doc._id}` })
			.setTimestamp()

		const enterBtn = new ButtonBuilder().setCustomId(`giveaway_enter:${doc._id}`).setLabel("Enter").setStyle(ButtonStyle.Primary)
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(enterBtn)

		// Post the giveaway in the channel
		const posted = await (channel as any).send({ embeds: [embed], components: [row] })
		await Giveaway.findByIdAndUpdate(doc._id, { $set: { messageId: String(posted.id) } })

		// Schedule a ScheduledTask to end the giveaway — encode the giveaway id in the payload content so the scheduler can trigger finalization.
		await ScheduledTask.create({
			guildId: guild.id,
			createdBy: host.id,
			type: "channel_message",
			scheduleKind: "once",
			whenIso: endsAt,
			tz: "UTC",
			channelId: channel.id,
			payload: { content: `GIVEAWAY_END:${doc._id}` },
			nextRunAt: endsAt,
			status: "active",
		})

		await interaction.reply({ content: `Giveaway created and posted in ${channel}. (ID: ${doc._id})`, ephemeral: true })
		Log.info(`[giveaway] created ${doc._id} by ${host.id} ends ${endsAt.toISOString()}`)
	})
