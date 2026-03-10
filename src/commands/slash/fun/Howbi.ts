import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"

export default new CommandExecutor()
	.setName("howbi")
	.setDescription("How bi are you?")
	.setBasePermission({
		Level: PermissionLevel.None,
	})
	.setExecutor(async (interaction) => {
		await interaction.reply({ content: "Yes. <:biflag:1063706578357850212>" })
	})