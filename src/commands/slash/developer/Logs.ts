import { Scope } from "../../../bootstrap/GlobalScope"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { exec } from "node:child_process"

export default new CommandExecutor()
	.setName("logs")
	.setDescription("Download NEST's logs.")
	.setBasePermission({
		Level: PermissionLevel.Developer,
		IsUser: ["1149913737558499358"],
		Scope: Scope.Admin
	})
	.setExecutor(async (interaction) => {
		await interaction.deferReply()
		let command: string
		switch (process.platform) {
			case 'linux':
				command = 'pm2 logs Core --nostream --lines=1000'
				break
			default:
				command = 'npx pm2 logs Core --nostream --lines=1000'
				break
		}
		exec(command, async (err, stdout) => {
			if (err) {
				await interaction.editReply(err)
				return
			}
			const buffer = Buffer.from(stdout, 'utf-8')
			await interaction.editReply({
				files: [
					{ attachment: buffer, name: 'logs.txt' }
				]
			})
		})
	})