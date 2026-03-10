import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor";
import { TagAssociation, tagGroupAsOptions } from "../../../utils/BitwiseTagHelpers";
import FastFlag from "../../../schemas/FastFlag";

const cooldownMap = new Map<string, number>();

export default new CommandExecutor()
.setName("search_post")
.setDescription("Perform a query on all posts with tagging")
.setBasePermission({
	Level: PermissionLevel.None,
})
.setExecutor(async (i) => {
	const flagFound = await FastFlag.findOne({
		refName: "ReleaseMarketTagSearch"
	})
	if (!flagFound || !flagFound.enabled) return;
	const currentCooldown = cooldownMap.get(i.user.id)
	if (currentCooldown && (Date.now() - currentCooldown) <= 30_000) {
		await i.reply({
			content: `Woah, too fast there! That command has a 30 second cooldown. Please try again later.`,
			ephemeral: true
		})
		return
	}
	const replyMessage = await i.reply({
		ephemeral: true,
		content: `0|N`,
		embeds: [
			new EmbedBuilder()
				.setTitle('Post Query')
				.setColor(Colors.Blurple)
				.setDescription(`You can search for posts using the below select menus. When you're ready to search, press **Search**, and I will open a new thread under that message.\n\nSelected Tags:\n\`\`\`\nNone\n\`\`\``)
				.setFooter({ text: `Ensure you only find the posts you're looking for with our staff-selected Market Tags` })
		],
		components: [
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId('post-search-execute')
					.setLabel('Search')
					.setStyle(ButtonStyle.Secondary)
			),
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				new StringSelectMenuBuilder()
					.addOptions(
						tagGroupAsOptions()
					)
					.setCustomId('post-search-group')
					.setPlaceholder('Choose a tag group')
			)
		]
	})
	cooldownMap.set(i.user.id, Date.now());
});
