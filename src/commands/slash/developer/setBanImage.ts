import { ChatInputCommandInteraction, Interaction, PermissionFlagsBits } from "discord.js";
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor";
import Settings from "../../../schemas/Settings";
import { Log } from "../../../utils/logging";

export default new CommandExecutor()
	.setName("set_ban_image")
	.setDescription("Set the ban image for the server.")
	.addStringOption(opt =>
		opt.setName("link")
			.setDescription("Enter the link for the image thats displayed after banning a user.")
			.setRequired(true)
	)
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
	.setBasePermission({
		Level: PermissionLevel.Developer,
	})
	.setExecutor(async (interaction: ChatInputCommandInteraction) => {
		if (!interaction.inCachedGuild()) {
			interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true })
			return
		};

		// im too lazy to add a regex check to see if the link is actually a link so just assume it is, its a dev command anyway
		const link = interaction.options.getString("link");

		const settings = await Settings.findOne({ guildID: interaction.guildId });

		await settings?.updateOne({ banImageLink: link }).catch((err: any) => {
			Log.error(err);
			return interaction.reply({ content: "An error occurred while updating the ban image. Please check the CONSOLE for more information!", ephemeral: true });
		});
		await interaction.reply({ content: "Success! Updated the ban image for the server.", ephemeral: true });
	});