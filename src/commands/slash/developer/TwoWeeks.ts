import { EmbedBuilder, Guild, PermissionFlagsBits } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { exec } from "node:child_process"

const moreMessages = "... And more"

export default new CommandExecutor()
	.setName("two_weeks")
	.setDescription("Members who joined less than two weeks ago")
	.setBasePermission({
		Level: PermissionLevel.Developer,
		IsUser: ["1149913737558499358", "1009717580270948372"]
	})
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) {
			await interaction.reply('You must be in a cached guild to use this command!')
			return
		}
		await interaction.deferReply()

		const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

		try {
			await interaction.guild.members.fetch()
			const recentMembers = interaction.guild.members.cache.filter((member) => {
				return member.joinedAt! > twoWeeksAgo
			})
			const recentMemberNames = []
			let len = 0
			let limitReached = false
			for (const recentMember of recentMembers.values()) {
				len += recentMember.user.username.length
				if ((len + moreMessages.length + 3) >= 4096) {
					limitReached = true
					break
				}
				recentMemberNames.push(recentMember.user.username)
			}

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setTitle('Member List')
						.setDescription('Members that joined less than **two weeks ago**:\n- ' + recentMemberNames.join("\n- ") + `${limitReached ? ('\n' + moreMessages) : ''}`)
				]
			})
		} catch (err) {
			await interaction.editReply(`Failed: ${err}`)
		}
	})