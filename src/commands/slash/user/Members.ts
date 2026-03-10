import { EmbedBuilder, GuildMember } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { config } from "../../../utils/config"

export default new CommandExecutor()
	.setName("members")
	.setDescription("Get the member count.")
	.addNumberOption(opt =>
		opt.setName("member_count")
			.setDescription("See how many members we need to reach a goal!")
			.setRequired(false)
	)
	.setBasePermission({
		Level: PermissionLevel.None,
	})
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }
		await interaction.deferReply()

		const members = interaction.options.getNumber("member_count")

		const fetchedMembers = await interaction.guild.members.fetch()
		const totalMembers = fetchedMembers.size.toLocaleString()
		const totalHumans = fetchedMembers.filter((member: GuildMember) => !member.user.bot).size.toLocaleString()
		const totalBots = fetchedMembers.filter((member: GuildMember) => member.user.bot).size.toLocaleString()

		let description = "Error, if this persists, contact an NEST developer."
		if (members && !isNaN(members) && members > fetchedMembers.size) {
			description = `**${(members - fetchedMembers.size).toLocaleString()}** members until **${members.toLocaleString()}** members!`
		} else {
			description = `${config.arrowEmoji} **${totalMembers}** total members
			${config.arrowEmoji} **${totalHumans}** total humans
			${config.arrowEmoji} **${totalBots}** total bots`
		}

		const membersEmbed = new EmbedBuilder()
			.setDescription(description)
			.setColor("Random")
		interaction.editReply({ embeds: [membersEmbed] })

	})