import { ChannelType } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { resolveTicketStatusEmbed, updateTicketStatus } from "../../../events/ticket/TicketStatusUpdate"
import TicketStatus from "../../../schemas/TicketStatus"

export default new CommandExecutor()
	.setName("sendticketstatus")
	.setDescription("Send the \"Ticket Status\" embed.")
	.setBasePermission({
		Level: PermissionLevel.Administrator,
	})
	.addChannelOption(opt =>
		opt
			.setName("channel")
			.setDescription("Input a channel to send the embed.")
			.setRequired(true)
	)
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }

		const channel = interaction.options.getChannel("channel")
		if (!channel || channel.type !== ChannelType.GuildText) {
			interaction.reply({ content: "Invalid channel provided!" })
			return
		}
		const webhook = await channel.createWebhook({ name: "Ticket System", avatar: interaction.guild.iconURL() || undefined })

		const status = await updateTicketStatus()
		const ticketStatusEmbed = await resolveTicketStatusEmbed(status)
		const message = await webhook.send({ embeds: [ticketStatusEmbed] }).catch(() => { })
		if (!message) {
			interaction.reply(`Failed`)
			return
		}
		await TicketStatus.findOneAndDelete({
			guildId: message.guildId
		})
		const data = await TicketStatus.create({
			guildId: message.guildId,
			channelId: message.channelId,
			messageId: message.id,
			ticketStatus: status
		})
		interaction.reply({ content: "Embed sent!" })
	})