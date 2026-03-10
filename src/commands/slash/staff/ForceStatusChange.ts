import { EmbedBuilder } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { config } from "../../../utils/config"
import { errorEmbed, handleError, sendModLogs } from "../../../utils/GenUtils"
import Case from "../../../schemas/Case"
import { Scope } from "../../../bootstrap/GlobalScope"
import PostTemplates from "../../../schemas/PostTemplates"

export default new CommandExecutor()
	.setName("post_status_change")
	.setDescription("Forcefully approve or deny a post template")
	.addStringOption(opt =>
		opt
			.setName("post_internal_id")
			.setDescription("Enter the post template id")
			.setRequired(true)
	)
	.addBooleanOption(opt =>
		opt
			.setName("new_status")
			.setDescription(`Whether the post should be approved or denied`)
			.setRequired(true)
	)
	.setBasePermission({
		Level: PermissionLevel.Administrator,
		/*
			1480436823984705557 = Help Forums Manager
		*/
		Scope: Scope.Admin
	})
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }

		const postId = interaction.options.getString("post_internal_id")
		const newPostStatus = interaction.options.getBoolean("new_status")!
		const foundTemplate = await PostTemplates.findOne({
			_id: postId
		})
		if (!foundTemplate) {
			await interaction.reply(`Failed to find that template.`)
			return
		}

		foundTemplate.approved = newPostStatus
		foundTemplate.waitingForApproval = false
		await foundTemplate.save()

		await interaction.reply(`Successfully set the template's status in ${foundTemplate.jobType} to **${newPostStatus ? 'APPROVED' : 'REJECTED'}**\n\n**Warning:** This debug function does not send any informational messages to the user or the approval log channels. Please manually inform them if required.`)
	})
