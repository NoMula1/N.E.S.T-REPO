import { EmbedBuilder } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { exec } from "node:child_process"
import { formatTime, handleError } from "../../../utils/GenUtils"

export default new CommandExecutor()
	.setName("processes")
	.setDescription("Get NEST's running processes")
	.setBasePermission({
		Level: PermissionLevel.Developer,
		HasRole: ["1177007392668536873"]
	})
	.setExecutor(async (interaction) => {
		await interaction.deferReply()
		exec('npx pm2 jlist', async (err, stdout) => {
			if (err) {
				await interaction.editReply(err)
				handleError(err)
				return
			}
			const procs = JSON.parse(stdout) as any[]
			let embeds: EmbedBuilder[]
			if (procs instanceof Array)
				embeds = procs.map((proc) => {
					console.log(proc.pm2_env)
					return new EmbedBuilder()
						.setTitle(`${proc.name || 'unknown'} (${proc.pid || -1})`)
						.setDescription(proc.pm2_env.status || 'unknown')
						.addFields(
							{ name: 'Uptime', value: formatTime(Date.now() - parseInt((proc.pm2_env || {}).pm_uptime)) },
						)
				})
			else
				embeds = []
			await interaction.editReply({
				content: 'NEST Running processes.',
				embeds: embeds
			})
		})
	})