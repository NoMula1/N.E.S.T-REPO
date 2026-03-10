import { EmbedBuilder, PermissionFlagsBits, ApplicationCommandType, MessageContextMenuCommandInteraction } from "discord.js"
import { PermissionLevel } from "../../../utils/CommandExecutor"
import { MessageContextCommandExecutor } from "../../../utils/ContextCommandExecutor"
import { sendModLogs } from "../../../utils/GenUtils"

export default new MessageContextCommandExecutor()
	.setName("Market Warn")
	.setBasePermission({
		Level: PermissionLevel.AssistantModerator,
		HasRole: ['1195598692569337918']
	})
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
	.setExecutor(async (interaction: MessageContextMenuCommandInteraction) => {
		await interaction.targetMessage.reply({
			content: `Hey! This is the wrong channel to market in, please read <#1243129204770603018> then use \`/post\` when you're ready!`
		})
		await interaction.targetMessage.delete().catch(() => { })
		await interaction.reply({
			content: `Successfully issued a verbal warning to \`${interaction.targetMessage.author.username}\``,
			ephemeral: true
		}).catch(() => { })
		await sendModLogs({ guild: interaction.guild!, mod: await interaction.guild!.members.fetch(interaction.member!.user.id), action: "Market Warn" }, { title: "Context Command", actionInfo: `**Market Misuse** by <@${interaction.targetMessage.member?.id}>\n> **Message**:\n> ${interaction.targetMessage} `, channel: interaction.channel || undefined })
	})