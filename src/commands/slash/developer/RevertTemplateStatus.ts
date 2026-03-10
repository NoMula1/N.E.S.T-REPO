import { Scope } from "../../../bootstrap/GlobalScope"
import PostTemplates from "../../../schemas/PostTemplates"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { exec } from "node:child_process"

export default new CommandExecutor()
	.setName("revert_template_status")
	.setDescription("Revert all templates to unapproved states")
	.setBasePermission({
		Level: PermissionLevel.Developer,
		Scope: Scope.Default
	})
	.setExecutor(async (interaction) => {
		const allTemplates = await PostTemplates.find({
			guildID: interaction.guildId
		})
		await interaction.reply({
			content: `Running task on ${allTemplates.length} documents...`
		})
		const startTask = Date.now()
		for (const thisTemplate of allTemplates) {
			thisTemplate.approved = false
			thisTemplate.waitingForApproval = false
			thisTemplate.isQueueServed = false
			await thisTemplate.save()
		}
		await interaction.editReply({
			content: `Updated ${allTemplates.length} documents in **${(Date.now() - startTask) / 1000}s** [\`${(Date.now() - startTask)}ms\`]`
		})
	})