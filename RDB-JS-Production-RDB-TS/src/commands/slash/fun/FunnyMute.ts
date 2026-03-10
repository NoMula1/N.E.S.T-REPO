import { EmbedBuilder, Message, PermissionFlagsBits } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { muteTypes, applyFunnyMute, muteMap } from "../../../utils/HandleFunnyMutes"

export default new CommandExecutor()
	.setName("funnymute")
	.setDescription("Funnily Mute a user")
	.addUserOption(opt => 
		opt.setName("user")
		.setDescription("The user to mute")
		.setRequired(true)
	)
	.addStringOption(opt =>
		opt.setName('mutetype')
		.setRequired(true)
		.setDescription('The mute type')
		.addChoices(...muteTypes.map(v => {
			return {
				name: v,
				value: v
			}
		})))
	.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
	.setBasePermission({
		Level: PermissionLevel.Administrator
	})
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }
		const type = interaction.options.getString("mutetype")
		const user = interaction.options.getUser("user")
		const found = muteMap.get(user?.id ?? '')
		if (found) {
			interaction.reply(`❌FAILED: ${user?.tag} is already muted!`)
			return
		}
		if (!user) {
			interaction.reply(`❌FAILED: User not found!`)
			return
		}
		if (type && muteTypes.includes(type.toString())) {
			await applyFunnyMute(user, type, interaction)
		} else {
			await interaction.reply(`Unknown mute type!`)
		}
	})