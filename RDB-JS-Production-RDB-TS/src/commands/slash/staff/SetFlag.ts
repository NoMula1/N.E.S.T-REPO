import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import FastFlag from "../../../schemas/FastFlag"
import { ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js"

export default new CommandExecutor()
	.setName("flag")
	.setDescription("Toggle a fast flag")
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
	.setBasePermission({
		Level: PermissionLevel.Moderator,
		HasRole: ['1195598692569337918']
	})
	.addStringOption(op => {
		// This will be populated dynamically with autocomplete
		return op.setName('reference_name')
			.setDescription('The fast flag name')
			.setRequired(true)
			.setAutocomplete(true)
	})
	.setExecutor(async interaction => {
		const refName = interaction.options.getString('reference_name')
		await interaction.deferReply()

		const flagFound = await FastFlag.findOne({
			refName: refName
		})
		if (!flagFound) {
			await interaction.editReply('Could not find a fast flag with that reference name.')
			return
		}

		flagFound.enabled = !flagFound.enabled
		if (flagFound.enabled) {
			flagFound.enabledBy = interaction.user.id
		} else {
			flagFound.enabledBy = undefined
		}
		flagFound.save().then(async (newEntry) => {
			await interaction.editReply(`\`${flagFound.refName}\` is now __${flagFound.enabled ? 'enabled' : 'disabled'}__.`)
		})
	})