import { ChatInputCommandInteraction } from 'discord.js';
import { CommandExecutor, PermissionLevel, Permission } from '../../../utils/CommandExecutor';
import PostTemplates from '../../../schemas/PostTemplates';
import { generateEmbed } from '../../../events/market/PostButton';
import { client } from '../../../Core';

export default new CommandExecutor()
	.setName("inspect_post")
	.setBasePermission({
		Level: PermissionLevel.MarketStaff
	})
	.setDescription("Inspect a post privately [market_staff]")
	.addUserOption(op =>
		op.setName('user')
			.setDescription('Pull via user [REQUIRES JOB_TYPE OPTION]')
	)
	.addStringOption(op =>
		op.setName('job_type')
			.setDescription('The job type [REQUIRES USER OPTION]')
			.addChoices(
				{ name: 'Hiring', value: 'HIRING' },
				{ name: 'For Hire', value: 'FOR_HIRE' },
				{ name: 'Selling', value: 'SELLING' }
			)
	)
	.addStringOption(op =>
		op.setName('post_id')
			.setDescription('Pull via post ID')
			.setMinLength(8)
	)
	.setExecutor(async (interaction: ChatInputCommandInteraction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }

		const optionUser = interaction.options.getUser('user')
		const optionJobType = interaction.options.getString('job_type')
		const optionPostId = interaction.options.getString('post_id')
		
		if (!optionUser && !optionJobType && !optionPostId) {
			await interaction.reply({
				ephemeral: true,
				content: `This command requires at least one search option.`
			})
			return
		}

		if ((optionUser && !optionJobType) || (!optionUser && optionJobType)) {
			await interaction.reply({
				ephemeral: true,
				content: `USER and JOB TYPE are paired options -- found only one set.`
			})
			return
		}

		await interaction.deferReply({
			ephemeral: true
		})

		let post: any = null
		let user: any = null
		if (optionPostId) {
			post = await PostTemplates.findOne({
				_id: optionPostId
			})
			user = await client.users.fetch(post.userID).catch(()=>{})
		} else {
			post = await PostTemplates.findOne({
				userID: optionUser!.id,
				jobType: optionJobType
			})
			user = optionUser
		}

		if (!post) {
			await interaction.editReply(`Failed to find that post!`)
			return
		}
		if (!user) {
			await interaction.editReply(`Failed to fetch that user!`)
			return
		}

		const postFetchResult = await generateEmbed(post as any, user, interaction.guild, true).catch((err)=>{console.log(err)})
		if (!postFetchResult) {
			await interaction.editReply(`Failed to visualize that post! It may be corrupted. Please ping the bot development team for a manual query.`)
			return
		}

		await interaction.editReply({
			content: postFetchResult.PostMessage,
			embeds: [
				postFetchResult.PostEmbed
			]
		})
	})