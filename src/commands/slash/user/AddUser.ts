import { Role, TextChannel } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { errorEmbed } from "../../../utils/GenUtils"
import Tickets from "../../../schemas/Tickets"

export default new CommandExecutor()
	.setName("adduser")
	.setDescription("Add a user to a ticket.")
	.addUserOption(opt =>
		opt
			.setName("user")
			.setDescription("Enter the user you would like to add.")
			.setRequired(true)
	)
	.setBasePermission({
		Level: PermissionLevel.None,
	})
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }

		const user = interaction.options.getUser("user")
		const member = interaction.options.getMember("user")
		if (!member || !user) {
			interaction.reply(errorEmbed("This user is not in the server!"))
			return
		}

		const foundTicket = await Tickets.findOne({
			guildID: interaction.guild.id,
			channelID: interaction.channel?.id,
			status: true,
		})
		if (!foundTicket) {
			interaction.reply(errorEmbed("This channel is not a valid ticket."))
			return
		}

		if (interaction.user.id !== foundTicket.creatorID) {
			if (interaction.member.guild.roles.cache.find((r: Role) => r.name.toLowerCase() === "assistant moderator")?.position! > interaction.member.guild.roles.highest.position && interaction.user.id !== foundTicket.creatorID) {
				interaction.reply(errorEmbed("You do not have permission to add a user to this ticket."))
				return
			}
		}
		if (foundTicket.users.includes(user.id)) {
			interaction.reply(errorEmbed("This user is already added to the ticket. Use `/removeuser` to remove them from the ticket."))
			return
		}

		await (interaction.channel as TextChannel).permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true })
		await foundTicket.updateOne({
			$push: { users: user.id }
		})

		interaction.reply({ content: `<@${user.id}> has been added to the ticket.` })

	})