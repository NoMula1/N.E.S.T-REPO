import { EmbedBuilder, PermissionFlagsBits } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import Qotd from "../../../schemas/Qotd"
import { Log } from '../../../utils/logging'

export default new CommandExecutor()
  .setName("question")
  .setDescription("Edit/View the QOTD Queue")
  .addStringOption(opt =>
	opt.setName("add")
	  .setDescription("Add a question to the Qotd Queue")    
	.setRequired(false)
	)
	.addBooleanOption(opt => opt
		.setName("list")
		.setDescription("List all of the qotd questions")
		.setRequired(false)    
	)
	.setDefaultMemberPermissions(
		PermissionFlagsBits.BanMembers // we need to find a better "base" staff permission
	)
	.setBasePermission({
		Level: PermissionLevel.AssistantModerator,
		HasRole: ['704146950907363418']
	})
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }
		const add = interaction.options.getString("add")
		const list = interaction.options.getBoolean("list")
		if (!add && !list || add && list) {
			interaction.reply({content: "You must use a valid option", ephemeral: true})
			return
		}
		if (add) {
			const newQuestion = new Qotd({
				question: add,
				userID: interaction.member.id
			})
			await newQuestion.save()
		
			interaction.reply({ embeds: [new EmbedBuilder()
				.setColor("Green")
				.setDescription(`Added "${add}" to the qotd list`)
			], ephemeral: true })
			return
		};
		if (list) {
			const questions = await Qotd.find({})
			if (questions.length === 0) {
				interaction.reply({content: "Failed to fetch any questions to list", ephemeral: true})
				return
			}
			const questionList = questions.map(q => {
				const user = interaction.guild?.members.cache.get(q.userID)
				return `**Question:** ${q.question}\n**Added by:** ${user ? user.displayName : 'Unknown User'}`
			}).join('\n\n')

			interaction.reply({embeds: [new EmbedBuilder()
				.setColor("Green")
				.setDescription(questionList)
			]})
		}
		
	})
