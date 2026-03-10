import { EmbedBuilder, PermissionFlagsBits, ApplicationCommandType, MessageContextMenuCommandInteraction, GuildMember } from "discord.js"
import { PermissionLevel } from "../../../utils/CommandExecutor"
import { MessageContextCommandExecutor } from "../../../utils/ContextCommandExecutor"
import { Log } from "../../../utils/logging"
import { sendModLogs } from "../../../utils/GenUtils"
import ms from "ms"

export default new MessageContextCommandExecutor()
	.setName("Disrespectful Content")
	.setBasePermission({
		Level: PermissionLevel.AssistantModerator,
		HasRole: ['1195598692569337918']
	})
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
	.setExecutor(async (interaction: MessageContextMenuCommandInteraction) => {
		if (interaction.targetMessage.member?.roles.highest.rawPosition! < ((await interaction.guild?.members.fetch(interaction.member?.user?.id!))?.roles.highest.rawPosition ?? 0)) {
			await interaction.targetMessage.reply({
				embeds: [
					new EmbedBuilder()
						.setTitle(`Disrespectful Content`)
						.setDescription(`Please remember to follow our [Server Rules](https://canary.discord.com/channels/489424959270158356/753682979284451368/796282622497521704)`
							+ '\n\nYour message has been flagged for as disrespectful. Messages that disrespect another member or their race, culture, religion, etc, are not allowed.'
							+ '\nFurther rule violations may lead to a more severe punishment! Thank you for keeping NIGHTHAWK SERVERS safe.')
						.setFooter({
							text: 'NIGHTHAWK SERVERS Flagging'
						})
						.setColor(0xFF3B30)
				]
			}).catch(() => { }).then(async () => {

				interaction.targetMessage.member!.timeout(ms("5m"), '[Interaction App Flagging]: Flag for disrespectful content').catch((err) => {
					Log.error(`Missing permissions to timeout user ${interaction.targetMessage.member!.id} for interaction app flagging`)
				})
				await interaction.targetMessage.delete().catch(() => { })
				await interaction.reply({
					content: `Successfully issued a verbal warning to \`${interaction.targetMessage.author.username}\``,
					ephemeral: true
				})

				await sendModLogs({ guild: interaction.guild!, mod: await interaction.guild!.members.fetch(interaction.member!.user.id), action: "Ban" }, { title: "Context Command", actionInfo: `**Disrespect** issued to <@${interaction.targetMessage.member?.id}>\n> **Message**:\n> ${interaction.targetMessage} `, channel: interaction.channel || undefined })

			})
		} else {
			await interaction.reply({
				content: `You cannot issue a warning to a user with a higher role than you.`,
				ephemeral: true
			})
		}
	})
