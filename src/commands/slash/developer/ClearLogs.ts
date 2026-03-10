import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { exec } from "node:child_process"
import { handleError } from "../../../utils/GenUtils"
import { Scope } from "../../../bootstrap/GlobalScope"

export default new CommandExecutor()
	.setName("clearlogs")
	.setDescription("Clear NEST's logs")
	.setBasePermission({
		Level: PermissionLevel.Developer,
		Scope: Scope.Admin
	})
	.setExecutor(async (interaction) => {
		await interaction.deferReply()
		exec('npx pm2 flush', async (err) => {
			if (err) {
				await interaction.editReply(err)
				handleError(err)
				return
			}
			await interaction.editReply('Cleared logs.')
		})
	})