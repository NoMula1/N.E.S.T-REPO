import { Message } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { config } from "../../../utils/config"
import PostTemplates from "../../../schemas/PostTemplates"
import { Scope } from "../../../bootstrap/GlobalScope"

export default new CommandExecutor()
	.setName("adminping")
	.setDescription("Get NEST Admin's latency and Discord API latency.")
	.setBasePermission({
		Scope: Scope.Admin,
		Level: PermissionLevel.None,
	})
	.setExecutor(async (interaction) => {
		const resultMessage: Message = await interaction.reply({ content: "🔃 Calculating...", fetchReply: true })
		const ping = resultMessage.createdTimestamp - interaction.createdTimestamp
		const before = Date.now()
		await PostTemplates.findOne({
			approved: true
		})
		const after = Date.now()
		const dbQueryLatency = after - before
		const replyMessage = `${config.successEmoji} Bot Latency Info\n- Bot Latency: **${ping}ms**\n- Websocket Latency: **${interaction.client.ws.ping}ms**`
			+ `\n- DB Query Latency: **${Math.round(dbQueryLatency)}ms**`
		interaction.editReply({ content: replyMessage })
	})
