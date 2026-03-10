import { PermissionFlagsBits } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import PostTemplates from "../../../schemas/PostTemplates"
import { Log } from "../../../utils/logging"


export default new CommandExecutor()
	.setName("clear_template")
	.setDescription("Clear a user's post templates")
	.addUserOption(opt =>
		opt.setName("user")
		.setDescription("User to select")
		.setRequired(true)
	)
	.addStringOption(opt =>
		opt.setName("type")
		.setDescription("Type of template to clear")
		.setRequired(true)
		.addChoices(
			{name: "FOR_HIRE", value: "for_hire"},
			{name: "HIRING", value: "hiring"},
			{name: "SELLING", value: "selling"},
		)
	)
	.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
	.setBasePermission({
		Level: PermissionLevel.Administrator,
		HasRole: ["1203545090132283402"]
	})
	.setExecutor(async interaction => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }
		const user = interaction.options.getUser("user")
		const type = interaction.options.getString("type")
		if (!user || !type) {
			return
		}
		switch(type) {
			case "for_hire":
				try {
					await PostTemplates.deleteOne({ userID: user.id, jobType: "SELLING"})
					interaction.reply({ content: `Successfully cleared the post template for ${user}`, ephemeral: true })
				} catch(err) {
					Log.error(err)
                    interaction.reply({ content: `Failed to clear the post template for ${user.username}`, ephemeral: true })
					return
				}
			    break
			case "hiring":
				try {
					await PostTemplates.deleteOne({ userID: user.id, jobType: "SELLING"})
					interaction.reply({ content: `Successfully cleared the post template for ${user}`, ephemeral: true })
				} catch(err) {
					Log.error(err)
                    interaction.reply({ content: `Failed to clear the post template for ${user.username}`, ephemeral: true })
					return
				}
				break
			case "selling":
				try {
					await PostTemplates.deleteOne({ userID: user.id, jobType: "SELLING"})
					interaction.reply({ content: `Successfully cleared the post template for ${user}`, ephemeral: true })
				} catch(err) {
					Log.error(err)
                    interaction.reply({ content: `Failed to clear the post template for ${user.username}`, ephemeral: true })
					return
				}
				break
			default: 
			    break
			
		}
	}
)