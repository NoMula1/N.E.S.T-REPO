import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { errorEmbed, getLengthFromString } from "../../../utils/GenUtils"
import Tickets from "../../../schemas/Tickets"

export default new CommandExecutor()
	.setName("close_request")
	.setDescription("Issue a close request to for a ticket!")
	.addStringOption(opt =>
		opt.setName("reason")
			.setDescription("Enter the reason for closing the ticket.")
			.setRequired(true)
	)
	.setBasePermission({
		Level: PermissionLevel.AssistantModerator,
	})
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }

		const foundTicket = await Tickets.findOne({
			guildID: interaction.guild.id,
			channelID: interaction.channel?.id,
			status: true,
		})
		if (!foundTicket) {
			interaction.reply(errorEmbed("This channel is not a valid ticket."))
			return
		}
		const length = await getLengthFromString("24h")
		const lengthNum = (Math.floor(Date.now() / 1000) + length[0]!) || 0
		await foundTicket.updateOne({
			autoClose: lengthNum,
			closeReason: interaction.options.getString("reason"),
		})

		const closeReqButtons = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder()
					.setStyle(ButtonStyle.Success)
					.setLabel("Close Ticket")
					.setCustomId("req_close")
					.setEmoji("☑"),
				new ButtonBuilder()
					.setStyle(ButtonStyle.Danger)
					.setLabel("Keep Open")
					.setCustomId("req_keep_open")
					.setEmoji("✖"),
			)

		const closeReq = new EmbedBuilder()
			.setAuthor({ name: "Close Ticket?", iconURL: interaction.guild.iconURL() || undefined })
			.setDescription(`Has this ticket been resolved? If so, please click \`CLOSE\`!
			
			**Reason:** ${interaction.options.getString("reason")}`)
			.setColor("Green")
			.setTimestamp()
			.setFooter({ text: "Ticket will close automatically in 24 hours." })
		interaction.reply({ content: `<@${foundTicket.creatorID}>`, embeds: [closeReq], components: [closeReqButtons.toJSON()] })

	})