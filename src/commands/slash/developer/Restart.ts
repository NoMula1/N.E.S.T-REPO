import { ChatInputCommandInteraction, Message } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { exec as _exec } from "node:child_process"
import { promisify } from 'node:util'
import Settings from "../../../schemas/Settings"
const exec = promisify(_exec)

export default (new CommandExecutor()
	.setName("restart")
	.setDescription("Restarts the bot")
	.addBooleanOption(option =>
		option.setName("stop")
			.setDescription("If the process will be killed instead")) as CommandExecutor)
	.setBasePermission({
		Level: PermissionLevel.Developer,
		IsUser: ["1149913737558499358"]
	})
	.setExecutor(async (interaction: ChatInputCommandInteraction) => {
		const resultMessage: Message = await interaction.deferReply({ fetchReply: true })
		const stop = interaction.options.getBoolean("stop", false)
		const guildSettings = await Settings.findOne({
			guildID: interaction.guildId
		})
		if (!guildSettings) {
			await interaction.editReply('Failed to find guild settings.')
			return
		}
		try {
			if (stop) {
				await interaction.editReply({ content: 'Stopping...' })
				await exec("pm2 stop all").catch(() => { })
				process.exit(-1) // Catch for cases where not using pm2
			} else {
				// Restart with pm2
				await interaction.editReply({ content: 'Restarting...' })
				await exec("pm2 restart Core").catch((err) => { })
			}
		} catch (e) {
			await interaction.editReply({ content: `Unable to ${stop ? "stop" : "restart"}: ${e}` })
		}
	})
