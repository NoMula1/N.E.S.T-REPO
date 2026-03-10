import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { promisify } from 'node:util'
import { exec as _exec } from "node:child_process"
const exec = promisify(_exec)
import { Log } from "../../../utils/logging"

export default new CommandExecutor()
	.setName("update")
	.setDescription("Checks out the latest bot version and restarts")
	.setBasePermission({
		Level: PermissionLevel.Developer,
	})
	.setExecutor(async (interaction) => {
		await interaction.reply({ content: 'Updating...', ephemeral: true })
		await interaction.editReply("Pulling from repo...")
		const startPull = Date.now()
		exec('git pull').then(async (r) => {
			await interaction.editReply(`PULL -> \`${Date.now() - startPull}ms\`\n\`\`\`fix\nOut~\n${r.stdout.substring(0, 300) + ((r.stdout.length > 300) ? '\n...' : '')}\`\`\`\n\nRestarting...`)
			await exec('pm2 restart core').catch((err) => { })
			// catch if not running pm2
			process.exit(-1)
		}).catch(async (err) => {
			await interaction.editReply(`Failed to pull from repo. Check logs for more information.`)
			Log.error(`Failed to pull from repo during update request:\n${err}`)
			return
		})
	})
