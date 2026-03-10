import { EmbedBuilder, PermissionFlagsBits } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"

export default new CommandExecutor()
	.setName("importantmessage")
	.setDescription("send an important message to a user")
	.addUserOption(opt =>
		opt.setName("user")
			.setDescription("User to send the important message to")
			.setRequired(true)
	)
	.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
	.setBasePermission({
		Level: PermissionLevel.AssistantModerator,
		HasRole: ['1480435758845395045', '1480436288296583228', '1480435906044362814']
		/**
		 * 1480435758845395045 = Marketplace Moderator
		 * 1480436288296583228 = Senior Marketplace Moderator
		 * 1480435906044362814 = Marketplace Manager
		 */
	})


	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }
		const user = interaction.options.getUser("user")
		if (!user) { interaction.reply({ content: "You must send this to a valid user!", ephemeral: true }); return }
		const guildMessageEmbed = new EmbedBuilder()
			.setDescription(`Sent a very important message to ${user}`)
			.setColor("Purple")

		const userMessageEmbed = new EmbedBuilder()
			.setTitle(`You got sent a very important message from ${interaction.user.username}`)
			.setDescription(`**Click on the Message Below!**\n# [IMPORTANT MESSAGE DO NOT SHARE](https://shattereddisk.github.io/rickroll/rickroll.mp4)`)
			.setColor("Yellow")
		interaction.reply({ embeds: [guildMessageEmbed] })
		user?.send({ embeds: [userMessageEmbed] })
	})