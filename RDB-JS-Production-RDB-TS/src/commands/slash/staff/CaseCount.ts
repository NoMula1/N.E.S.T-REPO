import { AttachmentBuilder, Colors, EmbedBuilder, PermissionFlagsBits, PermissionsBitField } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { errorEmbed, sendModLogs } from "../../../utils/GenUtils"
import { config } from "../../../utils/config"
import Case from "../../../schemas/Case"
import Settings from "../../../schemas/Settings"
import QuickChart from 'quickchart-js'

export default new CommandExecutor()
	.setName("case_count")
	.setDescription("View case count")
	.setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
	.setBasePermission({
		Level: PermissionLevel.Moderator
	})
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }
		
		await interaction.deferReply()

		const chartInstance = new QuickChart()

		const trackedCases = await Case.countDocuments()
		const guildSettings = await Settings.findOne({
			guildID: interaction.guildId!
		})
		const allCases = guildSettings?.caseCount

		const caseTypes = {
			BAN: await Case.countDocuments({ caseType: "BAN" }),
			UNBAN: await Case.countDocuments({ caseType: "UNBAN" }),
			KICK: await Case.countDocuments({ caseType: "KICK" }),
			MUTE: await Case.countDocuments({ caseType: "MUTE" }),
			UNMUTE: await Case.countDocuments({ caseType: "UNMUTE" }),
			WARN: await Case.countDocuments({ caseType: "WARN" }),
			MODERATION_INFER: await Case.countDocuments({ caseType: "MODERATION_INFER" }),
		}

		const chartConfiguration = {
			type: 'pie',
			data: {
				labels: Object.keys(caseTypes),
				datasets: [{
					data: Object.values(caseTypes),
					backgroundColor: [
						'rgba(255, 99, 132, 0.6)',
						'rgba(54, 162, 235, 0.6)',
						'rgba(255, 206, 86, 0.6)',
						'rgba(75, 192, 192, 0.6)',
						'rgba(153, 102, 255, 0.6)',
						'rgba(255, 159, 64, 0.6)',
						'rgba(128, 128, 128, 0.6)'
					]
				}]
			},
			options: {
				plugins: {
					legend: {
						labels: {
							color: 'white', // Set legend text color to white
						},
					},
				},
				layout: {
					backgroundColor: 'black', // Set background to black
				},
			},
		}

		chartInstance.setConfig(chartConfiguration as any)

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setTitle(`Case Count`)
					.setColor(Colors.Blurple)
					.setDescription(`Historically Tracked Cases: \`${allCases}\`\nActively Tracked Cases: \`${trackedCases}\``)
					.setImage(chartInstance.getUrl())
			]
		})
	})
