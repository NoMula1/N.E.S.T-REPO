import { EmbedBuilder } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import FastFlag from "../../../schemas/FastFlag"

const flagSetEmoji = '🚩'
const disabledEmoji = '❌'
const crossEmoji = '> ↳'

export default new CommandExecutor()
	.setName("listflags")
	.setDescription("List current fast flags")
	.setBasePermission({
		Level: PermissionLevel.Moderator,
		HasRole: ['1195598692569337918']
	})
	.addBooleanOption(op =>
		op.setName('filter_enabled')
			.setDescription('Filter between enabled and disabled flags'))
	.setExecutor(async (interaction) => {
		const filter = interaction.options.getBoolean('filter_enabled')
		await interaction.deferReply()

		let flagData = await FastFlag.find({})
		if (filter !== undefined && filter !== null) {
			flagData = await FastFlag.find({
				enabled: filter
			})
		}

		let filterText = ''
		if (filter === undefined || filter === null) {
			filterText = 'N/A'
		} else if (filter === true) {
			filterText = 'YES'
		} else if (filter === false) {
			filterText = 'NO'
		}

		let endString = `Showing ${flagData.length} flag${flagData.length > 1 ? 's' : ''} with filter \`ENABLED=${filterText}\`\n`
		for (const flag of flagData) {
			endString += `${flag.enabled ? flagSetEmoji : disabledEmoji} \`${flag.refName}\` \\| ${flag.description}\n`
			if (flag.enabled) {
				endString += `${crossEmoji} Enabled by <@${flag.enabledBy}> <t:${Math.round(flag.updatedAt.getTime() / 1000)}:R>\n`
			}
		}

		const flagsEmbed = new EmbedBuilder()
			.setTitle('Fast Flags')
			.setDescription(endString)
			.setFooter({
				text: `${flagSetEmoji} = Enabled | ${disabledEmoji} = Disabled`
			})

		await interaction.editReply({
			embeds: [
				flagsEmbed
			]
		})
	})