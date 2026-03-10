import { EmbedBuilder, PermissionFlagsBits } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { config } from "../../../utils/config"

// Not literal, does not actually ban users!
export default new CommandExecutor()
	.setName("ban_all")
	.setDescription("ban all users")
	.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
	.setBasePermission({
		Level: PermissionLevel.Administrator
	})
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }
		const banEmbed = new EmbedBuilder()
			.setDescription(`**Case:** #69 | **Mod:** ${interaction.user.username}`)
			.setColor("Green")

		interaction.reply({ content: `${config.arrowEmoji} Banning all **${interaction.guild.memberCount}** members.`, embeds: [banEmbed], fetchReply: true })

	})