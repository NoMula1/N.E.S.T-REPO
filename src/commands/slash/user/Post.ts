import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Guild, Role, User } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { config } from "../../../utils/config"
import { handleError } from "../../../utils/GenUtils"
import RoleBans from "../../../schemas/RoleBans"
import Case from "../../../schemas/Case"
import PostTemplates from "../../../schemas/PostTemplates"
import Settings from "../../../schemas/Settings"
import FastFlag from "../../../schemas/FastFlag"
import { Log } from "../../../utils/logging"

export default new CommandExecutor()
	.setName("post")
	.setDescription("Create a post in our marketplace!")
	.setBasePermission({
		Level: PermissionLevel.None,
	})
	.addStringOption(opt =>
		opt
			.setName("job_type")
			.setDescription("Which part of the marketplace would you like to submit a post to?")
			.setRequired(true)
			.addChoices(
				{ name: "Hiring", value: "HIRING" },
				{ name: "For Hire", value: "FOR_HIRE" },
				{ name: "Selling", value: "SELLING" }
			)
	)
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }

		const postingDisabled = await FastFlag.findOne({
			refName: 'DisablePostCreation',
			enabled: true
		})
		if (postingDisabled) {
			await interaction.reply({
				ephemeral: true,
				content: 'Posting is currently disabled. Please try again later.'
			})
			return
		}
		await interaction.reply({ content: `${config.loadingEmoji} Verifying posting information...`, ephemeral: true, fetchReply: true })

		if (interaction.member.roles.cache.find((r: Role) => r.name.toLowerCase() === "market banned")) {
			const findRoleBan = await RoleBans.findOne({
				guildID: interaction.guild.id,
				userID: interaction.user.id,
				type: "MARKET BAN"
			})
			if (!findRoleBan) {
				await interaction.editReply({ content: `${config.failedEmoji} You are currently banned from using the marketplace, but I was unable to find a valid ban file.` })
				return
			}
			const findCase = await Case.findOne({
				guildID: interaction.guild.id,
				caseNumber: findRoleBan.caseNumber,
			})
			await interaction.editReply({
				content: `${config.failedEmoji} You are currently banned from using the marketplace\n**Ends:** <t:${findCase?.durationUnix}> (<t:${findCase?.durationUnix}:R>)`
			})
			return
		}

		const jobType = interaction.options.getString("job_type")

		if (!jobType) {
			await interaction.editReply({ content: `${config.failedEmoji} Unable to fetch job type. If this error persists, please contact a bot developer.` })
			return
		}

		await interaction.editReply({ content: `${config.loadingEmoji} Fetching post template...` })
		const postTemplateQuery = PostTemplates.findOne({
			guildID: interaction.guild.id,
			userID: interaction.user.id,
			jobType: jobType
		}, {
			description: 1,
			payment: 1,
			approved: 1,
			waitingForApproval: 1,
			author: 1,
			embedColor: 1,
			thumbnail: 1,
			image: 1,
			footer: 1,
			talentHubLink: 1,
			jobType: 1
		})
		let postTemplate = await postTemplateQuery
		if (!postTemplate) {
			await interaction.editReply({ content: `${config.loadingEmoji} No post template found! Creating one...` })

			const settings = await Settings.findOne({
				guildID: interaction.guild.id
			})
			if (!settings) {
				await interaction.editReply({ content: `${config.failedEmoji} Unable to check guild settings. If this error persists, please contact a bot developer.` })
				return
			}

			let isApproved = false
			const lotteryTotal = settings?.postApprovalLottery || 0
			const lotteryGuess = Math.random()
			//Log.debug(`Post lottery attempt: ${lotteryTotal} > ${lotteryGuess}`)
			if (lotteryTotal > lotteryGuess) {
				isApproved = true
				await interaction.user.send(`Your post has been auto-approved.\nReason: Anti-overload lottery`).catch(()=>{
					Log.error(`Unable to inform the user ${interaction.user.id} that their post has been auto-approved (lottery)`)
				})
			}
			if (interaction.member.roles.cache.hasAny("1257205848665489468", "1257206288111370281")) {
				isApproved = true
				await interaction.user.send(`Your post has been auto-approved.\nReason: **MASTER\_DEVELOPER** or **EXPERT\_DEVELOPER**`).catch(()=>{
					Log.error(`Unable to inform the user ${interaction.user.id} that their post has been auto-approved (expert role)`)
				})
			}

			postTemplate = new PostTemplates({
				guildID: interaction.guild.id,
				userID: interaction.user.id,
				jobType: jobType,
				bitwiseTags: 0,
				approved: isApproved,
				isQueueServed: false,
				isSuspended: false,
				suspensionRenewCount: 0
			})
			postTemplate.save().catch(async (err: Error) => {
				handleError(err)
				await interaction.editReply({ content: `${config.failedEmoji} Unable to create post template! If this error persists, please contact a bot developer.` })
				return
			})
		} else {
			if (interaction.member.roles.cache.hasAny("1257205848665489468", "1257206288111370281") && postTemplate.approved === false) {
				postTemplate.approved = true
				await postTemplate.save()
				await interaction.user.send(`Your post has been auto-approved.\nReason: **MASTER\_DEVELOPER** or **EXPERT\_DEVELOPER**`).catch(()=>{})
			}
		}

		await interaction.editReply({ content: `${config.loadingEmoji} Generating template embed...` })

		const templateEmbed = await generateEmbed(postTemplate, interaction.user, interaction.guild)

		await interaction.editReply({ content: `${config.loadingEmoji} Generating template buttons...` })

		interaction.editReply({ content: templateEmbed.PostMessage, embeds: [templateEmbed.PostEmbed], components: templateEmbed.PostButtons })

	})

async function generateEmbed(template: any, user: User, guild: Guild): Promise<{ PostEmbed: EmbedBuilder; PostMessage: string; PostButtons: ActionRowBuilder<ButtonBuilder>[]; }> {
	const settings = await Settings.findOne({
		guildID: guild.id
	})
	let postEmoji = config.successEmoji
	let issuesFound = 0
	let postIssues = ``
	if (!template.description) {
		issuesFound++
		postIssues = postIssues + "\n> No description set."
		postEmoji = config.failedEmoji
	}
	if (!template.payment.robux && !template.payment.money && !template.payment.other) {
		issuesFound++
		postIssues = postIssues + "\n> No payments set."
		postEmoji = config.failedEmoji
	}
	if (template.approved == false && settings?.requirePostApproval == true && !template.waitingForApproval) {
		issuesFound++
		postIssues = postIssues + "\n> You must submit your template for approval."
		postEmoji = config.failedEmoji
	}
	postIssues = `**Found ${issuesFound} issues:**` + postIssues
	const embed = new EmbedBuilder()
		.setAuthor({ name: template.author || `${user.username} | Edit this by boosting! (Will not show once posted)`, iconURL: user.displayAvatarURL() || undefined })
		.setColor(template.embedColor || "Green")
		.setDescription(template.description || "No description set! Make sure to add as much detail as possible.")
		.addFields({ name: "Payment", value: `**Robux:** ${template.payment.robux || "NONE SET"}\n**Money:** ${template.payment.money || "NONE SET"}\n**Other:** ${template.payment.other || "NONE SET"}` })
		.setThumbnail(template.thumbnail || null)
		.setFooter({ text: template.footer.text || "None set | Edit this by boosting! (Will not show once posted)", iconURL: template.footer.icon || undefined })
	if (template.image) {
		embed.setImage(template.image!)
	}
	if (template.talentHubLink) {
		embed.addFields(
			{ name: 'Talent Hub', value: template.talentHubLink, inline: true }
		)
	}

	const templateRow = new ActionRowBuilder<ButtonBuilder>()
		.addComponents(
			new ButtonBuilder()
				.setLabel("Send Post")
				.setCustomId("send_post")
				.setEmoji("⬆️")
				.setStyle(ButtonStyle.Success),
			new ButtonBuilder()
				.setLabel("Edit Extras")
				.setCustomId("edit_extras")
				.setEmoji("👑")
				.setStyle(ButtonStyle.Primary),
		)
	if (template.approved == false && settings?.requirePostApproval == true) {
		templateRow.components[0].setLabel("Submit for Approval")
			.setCustomId("send_approval")
			.setEmoji("🗳")
			.setStyle(ButtonStyle.Primary)
	}

	const templateRowSecondary = new ActionRowBuilder<ButtonBuilder>()
		.addComponents(
			new ButtonBuilder()
				.setLabel("Edit Description")
				.setCustomId("edit_desc")
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setLabel("Edit Payment")
				.setCustomId("edit_payment")
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setLabel("Edit Images")
				.setCustomId("edit_images")
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setLabel("Add Talent Hub")
				.setCustomId("add_talent_hub")
				.setEmoji("🎨")
				.setStyle(ButtonStyle.Secondary)
		)
	if (issuesFound > 1 && template.approved == false && settings?.requirePostApproval == true) {
		templateRow.components[0].setDisabled(true)
	}
	if (issuesFound > 0 && settings?.requirePostApproval == false) {
		templateRow.components[0].setDisabled(true)
	}
	const templateRowPrem = new ActionRowBuilder<ButtonBuilder>()
		.addComponents(
			new ButtonBuilder()
				.setLabel("Delete Template")
				.setCustomId("delete_template")
				.setEmoji("🗑")
				.setStyle(ButtonStyle.Danger),
		)
	if (template.waitingForApproval == true) {
		postEmoji = config.warnEmoji
		postIssues = "Your job post is currently awaiting approval."
		issuesFound = 1
		for (const comp of templateRow.components) {
			comp.setDisabled(true)
		}
		for (const comp of templateRowSecondary.components) {
			comp.setDisabled(true)
		}
		for (const comp of templateRowPrem.components) {
			comp.setDisabled(true)
		}
	}

	let message = `${postEmoji} Post for ${template.jobType.toLowerCase()}`
	if (issuesFound > 0) {
		message = message + `\n${postIssues}`
	}

	return { PostEmbed: embed, PostMessage: message, PostButtons: [templateRow, templateRowSecondary, templateRowPrem] }
}