import { Colors, EmbedBuilder, Events, Interaction } from "discord.js"
import { reportPing } from "./ReportSubmit";
import { EventOptions } from "../../utils/RegisterEvents";

export default {
	name: Events.InteractionCreate,
	once: false,
	execute: async (_: EventOptions, interaction: Interaction) => {
		if (!interaction.isButton()) return;
		if (interaction.customId !== 'message-report-reviewed') return;

		const embed = new EmbedBuilder(interaction.message.embeds[0].data)
		embed.setTitle("~~Message Report~~")
		embed.setColor(Colors.Green)
		await interaction.update({
			content: reportPing,
			embeds: [embed],
			components: []
		})
	}
}
