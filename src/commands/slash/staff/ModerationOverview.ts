import { PermissionFlagsBits } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import Case from "../../../schemas/Case"
import { Scope } from "../../../bootstrap/GlobalScope"

function generateOverviewGraph(data: any) {


}

export default new CommandExecutor()
	.setName("moderation_overview")
	.setDescription("Receive charts based on moderation")
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
	.setBasePermission({
		Level: PermissionLevel.AssistantAdministrator,
		Scope: Scope.Admin
	})
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }

		const cases30d = await Case.find({
			dateIssued: {
				$gt: Date.now() - 2592000000
			}
		})

		console.log(generateOverviewGraph(cases30d))
	})