/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-named-as-default */
import { APIActionRowComponent, ActionRow, ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, Channel, ChannelType, ColorResolvable, Colors, Embed, EmbedBuilder, Events, Guild, GuildMember, GuildMemberRoleManager, Interaction, Message, MessageActionRowComponent, ModalBuilder, ModalSubmitInteraction, PermissionFlagsBits, PermissionsBitField, Role, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextChannel, TextInputBuilder, TextInputStyle, User } from "discord.js"
import { config } from "../../utils/config"
import PostTemplates, { PostTemplateType } from "../../schemas/PostTemplates"
import { handleError } from "../../utils/GenUtils"
import Settings from "../../schemas/Settings"
import FastFlag from "../../schemas/FastFlag"
import Post from "../../schemas/Post"
import { timetostring } from "../../utils/timeFuncs"
import { Log } from "../../utils/logging"
import PostTemplateChanges from "../../schemas/PostTemplateChanges"
import { type UserMarketNoteType } from "../../schemas/UserMarketNote"
import UserMarketNote from "../../schemas/UserMarketNote"
import { EventOptions } from "../../utils/RegisterEvents"
import { TagAssociation } from "../../utils/BitwiseTagHelpers"
const ILLEGAL_CHAR_BLACKLIST = [ // A compiled list of characters that are intended to be annoying / take up an exceptional amount of space - tl;dr: banned chars
	"꧅",
	"𒐫",
	"𒈙",
	"⸻",
	"﷽",
	"௵",
	"௸",
	"‱"
]

const NON_BOOSTER_COOLDOWN_DURATION = 14400000 // 4 hours
const BOOSTER_COOLDOWN_DURATION = 3600000 // 1 hour

const localPostTemplateCache = new Map<string, Date>()
const TALENT_HUB_REGEX = /(?:https:\/\/)?create\.roblox\.com\/talent\/creators\/\d+/gm

const allRelatedRankedRoles = {
	Master: [
		"1247666796870369361",
		"1247668291732897935",
		"1247669509595201579",
		"1247669875233783979",
		"1247670679768141885",
		"1247670306563166281",
		"1247678778289815613",
		"1247679064802725949",
		"1272605491935318017",
		"1279916846174310524",
		"1257205848665489468"
	],

	Expert: [
		"1247667857559392380",
		"1247668253430644826",
		"1247669478339379362",
		"1247669853314355201",
		"1247670757287399526",
		"1247670436720803840",
		"1247678886599331991",
		"1247679328070668430",
		"1272605375085940766",
		"1279916821234847754",
		"1257206288111370281",
	],

	Intermediate: [
		"1247667863809163274",
		"1247668198086676511",
		"1247669422479507498",
		"1247669828085485609",
		"1247670785087373424",
		"1247670459852656680",
		"1247678999401074731",
		"1247679349298167909",
		"1272605216289849458",
		"1279916786514661386",
		"1257206107936395345",
	],

	Novice: [
		"1247667867776843888",
		"1247668154650595453",
		"1247669320063127625",
		"1247669744275030069",
		"1247670809573720150",
		"1247670488055152763",
		"1247679027968217150",
		"1247679369569112185",
		"1272605090154287229",
		"1279916754256003174",
		"1257206045005058079"
	]
}

async function getRankedRoles(member: GuildMember) {
    const rankPriority = ["Novice", "Intermediate", "Expert", "Master"]
    const roleMap = new Map<string, string>()

    for (const [rank, roleIds] of Object.entries(allRelatedRankedRoles)) {
        for (const roleId of roleIds) {
            if (member.roles.cache.has(roleId)) {
                const role = member.roles.cache.get(roleId)
                if (!role) continue

                const match = role.name.match(/(?:Novice|Intermediate|Expert|Master) (.+)/)
                if (!match) continue

                const skillType = match[1]

                if (!roleMap.has(skillType) || rankPriority.indexOf(roleMap.get(skillType)!) < rankPriority.indexOf(rank)) {
                    roleMap.set(skillType, rank)
                }
            }
        }
    }

    if (roleMap.size === 0) return null

    const formattedRanks = Array.from(roleMap.entries())
        .map(([skill, rank]) => `**${rank}** for **${skill}**`)
        .join(", ")

    return `${formattedRanks}.`
}

export default {
	name: Events.InteractionCreate,
	once: false,
	async execute(_: EventOptions, interaction: Interaction) {

		if (interaction.isButton()) {
			const id = interaction.customId


			switch (id) {

				case "edit_desc": /*  ~ Button: Edit Description ~ */
					{
						if (!interaction.inCachedGuild()) return
						const premiumRole = interaction.guild?.roles.cache.find((r: Role) => r.name.toLowerCase().includes("booster"))
						let hasPremium = false
						if (premiumRole && interaction.member.roles.cache.has(premiumRole.id) || interaction.member.roles.cache.find((r: Role) => { r.name.toLowerCase() === "staff" }) || interaction.member.roles.cache.find((r: Role) => { r.name.toLowerCase() === "booster benefits pass" })) {
							hasPremium = true
						}

						const jobType = getJobType(interaction)
						if (!jobType) {
							interaction.update({ content: `${config.failedEmoji} Unable to find valid job type! If this error persists, please contact a bot developer.`, embeds: [], components: [] })
							return
						}

						let maxChars = 1500
						if (hasPremium) {
							maxChars = 2000
						}

						const jobForm = new ModalBuilder()
							.setCustomId("job_description_modal")
							.setTitle("Enter a job post description")

						const args: TextInputBuilder[] = [
							new TextInputBuilder()
								.setCustomId("job_description")
								.setLabel("Enter description...")
								.setPlaceholder("Please enter a detailed description.")
								.setRequired(true)
								.setMinLength(30)
								.setMaxLength(maxChars)
								.setStyle(TextInputStyle.Paragraph)
						]

						for (const arg of args) {
							jobForm.addComponents(new ActionRowBuilder<TextInputBuilder>().setComponents(arg))
						}

					await interaction.showModal(jobForm as any)
					break
				}
				case "add_payment": {
					if (!interaction.inCachedGuild()) return

					const jobTypePayment = getJobType(interaction)
					if (!jobTypePayment) {
						interaction.update({ content: `${config.failedEmoji} Unable to find valid job type! If this error persists, please contact a bot developer.`, embeds: [], components: [] })
						return
					}

					const jobFormPayment = new ModalBuilder()
						.setCustomId("job_payment_modal")
						.setTitle("Enter payment detials")

					const argsPayment: TextInputBuilder[] = [
						new TextInputBuilder()
							.setCustomId("job_payment_robux")
							.setLabel("How much in Robux?")
							.setPlaceholder("None")
							.setRequired(false)
							.setMaxLength(30)
							.setStyle(TextInputStyle.Short),

						new TextInputBuilder()
							.setCustomId("job_payment_money")
							.setLabel("How much in real-world currency?")
							.setPlaceholder("None")
							.setRequired(false)
							.setMaxLength(30)
							.setStyle(TextInputStyle.Short),

						new TextInputBuilder()
							.setCustomId("job_payment_other")
							.setLabel("What other payments are being offered?")
							.setPlaceholder("None")
							.setRequired(false)
							.setMaxLength(100)
							.setStyle(TextInputStyle.Short),
					]

					for (const arg of argsPayment) {
						jobFormPayment.addComponents(new ActionRowBuilder<TextInputBuilder>().setComponents(arg))
					}

					await interaction.showModal(jobFormPayment as any)
					break
				}
				case "add_talent_hub": /*  ~ Button: Add Talent Hub ~ */
					{
						if (!interaction.inCachedGuild()) return

						const jobTypeTalent = getJobType(interaction)
						if (!jobTypeTalent) {
							interaction.update({ content: `${config.failedEmoji} Unable to find valid job type! If this error persists, please contact a bot developer.`, embeds: [], components: [] })
							return
						}

						const jobFormTalent = new ModalBuilder()
							.setCustomId("talent_hub_modal")
							.setTitle("Enter talent hub URL")

						const argsTalent: TextInputBuilder[] = [
							new TextInputBuilder()
								.setCustomId("talent_hub_url")
								.setLabel("What is your Talent Hub URL?")
								.setPlaceholder("https://create.roblox.com/talent/creators/12345678")
								.setRequired(true)
								.setMaxLength(60)
								.setMinLength(12)
								.setStyle(TextInputStyle.Short),
						]

						for (const arg of argsTalent) {
							jobFormTalent.addComponents(new ActionRowBuilder<TextInputBuilder>().setComponents(arg))
						}

					await interaction.showModal(jobFormTalent as any)
				break
			}
			case "add_images": {
				if (!interaction.inCachedGuild()) return

				const jobTypeImages = getJobType(interaction)
				if (!jobTypeImages) {
					interaction.update({ content: `${config.failedEmoji} Unable to find valid job type! If this error persists, please contact a bot developer.`, embeds: [], components: [] })
					return
				}
						const jobFormImages = new ModalBuilder()
							.setCustomId("job_images_modal")
							.setTitle("Enter images you'd like to add")

						const argsImages: TextInputBuilder[] = [
							new TextInputBuilder()
								.setCustomId("job_image")
								.setLabel("Enter post image URL")
								.setPlaceholder("Enter a valid IMAGE URL. (Or leave blank)")
								.setRequired(false)
								.setStyle(TextInputStyle.Short),

							new TextInputBuilder()
								.setCustomId("job_thumbnail")
								.setLabel("Enter post thumbnail URL")
								.setPlaceholder("Enter a valid IMAGE URL. (Or leave blank)")
								.setRequired(false)
								.setStyle(TextInputStyle.Short),
						]

						for (const arg of argsImages) {
							jobFormImages.addComponents(new ActionRowBuilder<TextInputBuilder>().setComponents(arg))
						}

						await interaction.showModal(jobFormImages as any)

						break
					}
				case "delete_template":
					{
						if (!interaction.inCachedGuild()) return

						const jobTypeDelete = getJobType(interaction)
						if (!jobTypeDelete) {
							interaction.update({ content: `${config.failedEmoji} Unable to find valid job type! If this error persists, please contact a bot developer.`, embeds: [], components: [] })
							return
						}

						const deleteRow = new ActionRowBuilder<ButtonBuilder>()
							.addComponents(
								new ButtonBuilder()
									.setCustomId("delete_template_yes")
									.setLabel("Yes")
									.setStyle(ButtonStyle.Danger),
								new ButtonBuilder()
									.setCustomId("prompt_no")
									.setLabel("No")
									.setStyle(ButtonStyle.Success),
							)

						await interaction.update({ content: `${config.warnEmoji} You are about to delete your post template for ${jobTypeDelete.toLowerCase()}. You will NOT be able to recover it. __Are you sure you wish to continue?__`, embeds: [], components: [deleteRow as any] })

						break
					}
				case "delete_template_yes":

					{
						if (!interaction.inCachedGuild()) return

						const jobTypeDeleteYes = getJobType(interaction)
						if (!jobTypeDeleteYes) {
							interaction.update({ content: `${config.failedEmoji} Unable to find valid job type! If this error persists, please contact a bot developer.`, embeds: [], components: [] })
							return
						}

						const deleteRowYes = new ActionRowBuilder<ButtonBuilder>()
							.addComponents(
								new ButtonBuilder()
									.setCustomId("delete_template_yes")
									.setLabel("Yes")
									.setStyle(ButtonStyle.Danger)
									.setDisabled(true),
								new ButtonBuilder()
									.setCustomId("prompt_no")
									.setLabel("No")
									.setStyle(ButtonStyle.Success)
									.setDisabled(true),
							)

						await interaction.update({ content: `${config.loadingEmoji} Deleting your post template.`, components: [deleteRowYes as any] })

						await PostTemplates.findOneAndDelete({
							userID: interaction.user.id,
							guildID: interaction.guild.id,
							jobType: jobTypeDeleteYes
						}).then(async () => {
							await interaction.editReply({ content: `${config.loadingEmoji} Post template successfully deleted.` })
						}).catch(async (err: Error) => {
							handleError(err)
							await interaction.editReply({ content: `${config.failedEmoji} Oops! We ran into an issue deleting your post template, please contact a bot dev if this issue persists.` })
							return
						})

						await interaction.editReply({ content: `${config.loadingEmoji} Generating new post template...` })

						const newPostTemplate = new PostTemplates({
							guildID: interaction.guild.id,
							userID: interaction.user.id,
							jobType: jobTypeDeleteYes,
							approved: (interaction.member.roles.cache.hasAny("1257205848665489468", "1257206288111370281")),
						})
						newPostTemplate.save().catch(async (err: Error) => {
							handleError(err)
							await interaction.editReply({ content: `${config.failedEmoji} Unable to create post template! If this error persists, please contact a bot developer.` })
							return
						}).then(async () => {
							if (interaction.message.content.includes(`${config.failedEmoji}`)) {
								return
							}
							await interaction.editReply({ content: `${config.loadingEmoji} Post template created, generating embed...` })

							const templateEmbed = await generateEmbed(newPostTemplate, interaction.user, interaction.guild)

							await interaction.editReply({ content: `${config.loadingEmoji} Generating template buttons...` })

							await interaction.editReply({ embeds: [templateEmbed.PostEmbed], content: templateEmbed.PostMessage, components: templateEmbed.PostButtons.map(btn => btn as any) })
						})
						break
					}
				case "prompt_no":

					{
						if (!interaction.inCachedGuild()) return

						const jobTypeDeleteNo = getJobType(interaction)
						if (!jobTypeDeleteNo) {
							interaction.update({ content: `${config.failedEmoji} Unable to find valid job type! If this error persists, please contact a bot developer.`, embeds: [], components: [] })
							return
						}

						const deleteRowNo = new ActionRowBuilder<ButtonBuilder>()
							.addComponents(
								new ButtonBuilder()
									.setCustomId("generic_prompt_yes")
									.setLabel("Yes")
									.setStyle(ButtonStyle.Danger)
									.setDisabled(true),
								new ButtonBuilder()
									.setCustomId("prompt_no")
									.setLabel("No")
									.setStyle(ButtonStyle.Success)
									.setDisabled(true),
							)

						await interaction.update({ content: `${config.loadingEmoji} Returning you back to the post template editor...`, components: [deleteRowNo as any] })

						const postTemplateNo = await PostTemplates.findOne({
							userID: interaction.user.id,
							guildID: interaction.guild.id,
							jobType: jobTypeDeleteNo
						})


						const templateDeleteNo = await generateEmbed(postTemplateNo!, interaction.user, interaction.guild)

						await interaction.editReply({ embeds: [templateDeleteNo.PostEmbed], content: templateDeleteNo.PostMessage, components: templateDeleteNo.PostButtons.map(btn => btn as any) })
						break
					}
				case "send_approval":
					{
						if (!interaction.inCachedGuild()) return

						const jobTypeApproval = getJobType(interaction)
						if (!jobTypeApproval) {
							interaction.update({ content: `${config.failedEmoji} Unable to find valid job type! If this error persists, please contact a bot developer.`, embeds: [], components: [] })
							return
						}

						const approvalRow = new ActionRowBuilder<ButtonBuilder>()
							.addComponents(
								new ButtonBuilder()
									.setCustomId("approve_template_yes")
									.setLabel("Yes")
									.setStyle(ButtonStyle.Success),
								new ButtonBuilder()
									.setCustomId("prompt_no")
									.setLabel("No")
									.setStyle(ButtonStyle.Danger),
							)

						await interaction.update({
							embeds: [
								new EmbedBuilder()
									.setTitle("Job Template Approval")
									.setDescription(`${config.warnEmoji} You are about to submit your job template for ${jobTypeApproval.toLowerCase()} to be approved. You will NOT be able to edit your template until it has been answered. __Are you sure you wish to continue?__`)
									.setColor("Orange")
									.setFooter({
										text: "NIGHTHAWK SERVERS Marketplace"
									})
							],
							components: [approvalRow as any],
							content: jobTypeApproval.toLowerCase()
						})
						// await interaction.update({ content: `${config.warnEmoji} You are about to submit your job template for ${jobTypeApproval.toLowerCase()} to be approved. You will NOT be able to edit your template until it has been answered. __Are you sure you wish to continue?__`, embeds: [], components: [approvalRow] });
						break
					}
				case "approve_template_yes":
					{
						if (!interaction.inCachedGuild()) return

						const marketFlag = await FastFlag.findOne({
							refName: 'ReleaseMarketRevamp',
							enabled: true
						})

						const jobTypeApprovalYes = getJobType(interaction)
						if (!jobTypeApprovalYes) {
							interaction.update({ content: `${config.failedEmoji} Unable to find valid job type! If this error persists, please contact a bot developer.`, embeds: [], components: [] })
							return
						}

						const approvalChannel = interaction.guild.channels.cache.find((c: Channel) => {
							if (c.type === ChannelType.GuildText) {
								if (c.name === "template-approvals") {
									return c
								}
							}
						})
						if (!approvalChannel) {
							await interaction.update({ content: `${config.failedEmoji} Unable to find post approving channel. If this error persists please contact a bot developer.`, embeds: [], components: [] })
							return
						}
						if (approvalChannel.type !== ChannelType.GuildText) return

						const foundTemplateApprovalYes = await PostTemplates.findOne({
							guildID: interaction.guild?.id,
							userID: interaction.user.id,
							jobType: jobTypeApprovalYes,
						})
						if (!foundTemplateApprovalYes) {
							await interaction.update({ content: `${config.failedEmoji} That's odd... Your post template is missing! Please try again.`, embeds: [], components: [] })
							return
						}
						if (foundTemplateApprovalYes.waitingForApproval) {
							await interaction.update({
								content: `Your post is already awaiting approval!`,
								embeds: [],
								components: []
							})
							return
						}

						const approveRowYes = new ActionRowBuilder<ButtonBuilder>()
							.addComponents(
								new ButtonBuilder()
									.setCustomId("generic_prompt_yes")
									.setLabel("Yes")
									.setStyle(ButtonStyle.Danger)
									.setDisabled(true),
								new ButtonBuilder()
									.setCustomId("prompt_no")
									.setLabel("No")
									.setStyle(ButtonStyle.Success)
									.setDisabled(true),
							)

						await interaction.update({ content: `${config.loadingEmoji} Submitting your post for approval.`, components: [approveRowYes as any] })

						const approvalEmbed = await generateEmbed(foundTemplateApprovalYes, interaction.user, interaction.guild, true)

						let approvalButtons = new ActionRowBuilder<ButtonBuilder>()
							.addComponents(
								new ButtonBuilder()
									.setCustomId("approved_yes")
									.setLabel("Approve Template")
									.setStyle(ButtonStyle.Success),
								new ButtonBuilder()
									.setCustomId("approved_no")
									.setLabel("Reject Template")
									.setStyle(ButtonStyle.Danger),
								// new ButtonBuilder()
								// 	.setCustomId("view_notes")
								// 	.setLabel("View Notes")
								// 	.setStyle(ButtonStyle.Primary)
							)

						if (marketFlag) {
							approvalButtons = new ActionRowBuilder<ButtonBuilder>()
								.addComponents(
									new ButtonBuilder()
										.setCustomId('!!none')
										.setLabel("ReleaseMarketRevamp flag is switched. Use /queue serve instead.")
										.setStyle(ButtonStyle.Secondary)
										.setDisabled(true)
								)
						}

						const noteListApprove = await UserMarketNote.find({
							userID: foundTemplateApprovalYes.userID
						})
						const message = await approvalChannel.send({ content: `Template in ${jobTypeApprovalYes} by: ${interaction.user.username} (${interaction.user.id} <@${interaction.user.id}>)\nUser joined <t:${Math.round(interaction.member.joinedAt!.getTime() / 1000)}:R>\nTemplate ID: \`${foundTemplateApprovalYes._id}\`\n${noteListApprove.length < 1 ? '' : `User has **${noteListApprove.length}** marketplace note(s)`}`, embeds: [approvalEmbed.PostEmbed], components: [approvalButtons as any] }).catch(() => { })

						await foundTemplateApprovalYes.updateOne({
							waitingForApproval: true,
							approvalMessageID: (message as Message<boolean>).id,
						})

						const updatedFoundTemplateApprovalYes = await PostTemplates.findOne({
							guildID: interaction.guild?.id,
							userID: interaction.user.id,
							jobType: jobTypeApprovalYes,
						})

						await interaction.editReply({ content: `${config.loadingEmoji} Approval sent! Sending you back to the template editor.` })

						const templateEditor = await generateEmbed(updatedFoundTemplateApprovalYes!, interaction.user, interaction.guild)

					await interaction.editReply({ content: templateEditor.PostMessage, embeds: [templateEditor.PostEmbed], components: templateEditor.PostButtons.map(btn => btn as any) })
					}
				case "view_notes": {
					if (!interaction.inCachedGuild()) return

					if (!interaction.member.roles.cache.hasAny("1480435906044362814", "1480436288296583228", "1480436503187423342", "1481021796298915972")) {
						interaction.reply({ content: `${config.failedEmoji} You do not have permission to do this.`, ephemeral: true })
						return
					}

					const approvalButtonsDisabled = new ActionRowBuilder<ButtonBuilder>()
						.addComponents(
							new ButtonBuilder()
								.setCustomId("approved_yes")
								.setLabel("Approve Template")
								.setStyle(ButtonStyle.Success)
								.setDisabled(true),
							new ButtonBuilder()
								.setCustomId("approved_no")
								.setLabel("Reject Template")
								.setStyle(ButtonStyle.Danger)
								.setDisabled(true),
							new ButtonBuilder()
								.setCustomId("approved_auto_reject")
								.setLabel("Auto Reject")
								.setStyle(ButtonStyle.Danger)
								.setDisabled(true),
							new ButtonBuilder()
								.setCustomId("approved_reverse_approval")
								.setLabel('Reverse Decision')
								.setStyle(ButtonStyle.Danger)

						)

					const template = await PostTemplates.findOne({
						approvalMessageID: interaction.message.id
					})
					if (!template) {
						interaction.update({ content: `${config.failedEmoji} No template found.`, embeds: [], components: [approvalButtonsDisabled as any] })
						return
					}
					const user = await interaction.client.users.fetch(template.userID) ?? interaction.client.users.cache.get(template.userID)
					if (!user)
						return

					const noteList = await UserMarketNote.find({
						userID: template.userID
					})
					let noteSummaryDisplay = noteList.length < 1 ? "User has no notes to display" : ""
					for (const note of noteList) {
						const noteTags = JSON.parse(note.tags ?? "[]")
						noteSummaryDisplay +=
							`\n\n## Note \`${note._id}\`${noteTags.length < 1 ? '' : ` | tags: \`${noteTags.join(', ')}\``}` +
							`\n> ${(note.description ?? 'No description set').substring(0, 49).replace("\n", " ")}${(note.description ?? 'No description set').length > 50 ? '...' : ''}` +
							`\n\\- <@${note.noteCreatorID}>`
					}

					const data = await generateNotesInterface(template, user, interaction.guild)
					await interaction.reply({
						ephemeral: true,
						content: user.id,
						embeds: [
							data[0] as unknown as Embed
						],
						components: [
							data[2] as unknown as ActionRow<MessageActionRowComponent>,
							// (noteList.length >= 1 ? (data[1] as any) : undefined)
						]
					})
					break
				}
				case "note_create": {
					const noteList = await UserMarketNote.countDocuments({
						userID: interaction.message.content
					})
					if (noteList >= 10) {
						await interaction.reply(`Failed: This user has reached the maximum amount of allowed notes (10). Please run \`/notes delete\` to delete one of the notes.`)
						return
					}
					const user = interaction.client.users.cache.get(interaction.message.content)
					if (!user) {
						await interaction.reply({
							content: 'Failed: could not find user',
							ephemeral: true
						})
						return
					}

					const thisNote = await UserMarketNote.create({
						userID: interaction.message.content,
						noteCreatorID: interaction.user.id,
						isInternal: false,
						saved: false,
						tags: "[]",
						attachedTemplates: "[]"
					})
					const generated = await generateNoteCreateInterface(thisNote, user, interaction.guild!)

					await interaction.reply({
						embeds: [generated[0] as unknown as Embed],
						components: generated[1] as unknown as ActionRow<MessageActionRowComponent>[],
						ephemeral: true
					})

					break
				}
				case "approved_auto_reject":
					if (!interaction.inCachedGuild()) return

					if (!interaction.member.roles.cache.hasAny("1480435906044362814", "1480436288296583228", "1480436503187423342", "1481021796298915972")) {
						interaction.reply({ content: `${config.failedEmoji} You do not have permission to do this.`, ephemeral: true })
						return
					}
					break
				case "approved_yes":
					{
						if (!interaction.inCachedGuild()) return

						if (!interaction.member.roles.cache.hasAny("1480435906044362814", "1480436288296583228", "1480436503187423342", "1481021796298915972")) {
							interaction.reply({ content: `${config.failedEmoji} You do not have permission to do this.`, ephemeral: true })
							return
						}

						const approvalButtonsDisabled = new ActionRowBuilder<ButtonBuilder>()
							.addComponents(
								new ButtonBuilder()
									.setCustomId("approved_yes")
									.setLabel("Approve Template")
									.setStyle(ButtonStyle.Success)
									.setDisabled(true),
								new ButtonBuilder()
									.setCustomId("approved_no")
									.setLabel("Reject Template")
									.setStyle(ButtonStyle.Danger)
									.setDisabled(true),
								new ButtonBuilder()
									.setCustomId("approved_auto_reject")
									.setLabel("Auto Reject")
									.setStyle(ButtonStyle.Danger)
									.setDisabled(true),
								new ButtonBuilder()
									.setCustomId("approved_reverse_approval")
									.setLabel('Reverse Decision')
									.setStyle(ButtonStyle.Danger)

							)


						const approvalTemplate = await PostTemplates.findOne({
							approvalMessageID: interaction.message.id
						})
						if (!approvalTemplate) {
							interaction.update({ content: `${config.failedEmoji} No template found.`, embeds: [], components: [approvalButtonsDisabled as any] })
							return
						}

						const approveUser = interaction.guild.members.cache.get(approvalTemplate.userID)
						if (!approveUser) {
							interaction.update({ content: `${config.failedEmoji} User has left the server. Automatically declining template.`, embeds: [], components: [approvalButtonsDisabled as any] })
							await approvalTemplate.updateOne({
								waitingForApproval: false,
								approvalMessageID: "",
							})
							return
						}

						const cachedPostTemplate = localPostTemplateCache.get(interaction.message.id)
						if (cachedPostTemplate) {
							Log.info(`Logging non-unique post template change for market mod ${interaction.user.id} on message ${interaction.message.id}`)
							await PostTemplateChanges.create({
								marketModerator: interaction.user.id,
								userId: approveUser.id,
								templateChannel: approvalTemplate.jobType ?? "UNKNOWN",
								templateType: "APPROVE",
								templateCreatedAt: approvalTemplate.createdAt,
								templateChangedAt: approvalTemplate.updatedAt,

								isActionUnique: false
							})
						} else {
							Log.info(`Logging unique post template change for market mod ${interaction.user.id} on message ${interaction.message.id}`)
							await PostTemplateChanges.create({
								marketModerator: interaction.user.id,
								userId: approveUser.id,
								templateChannel: approvalTemplate.jobType ?? "UNKNOWN",
								templateType: "APPROVE",
								templateCreatedAt: approvalTemplate.createdAt,
								templateChangedAt: approvalTemplate.updatedAt,

								isActionUnique: true
							})
							localPostTemplateCache.set(interaction.message.id, new Date())
						}

						await interaction.update({ content: `${config.loadingEmoji} Approving template...`, components: [approvalButtonsDisabled as any] })

						await approvalTemplate.updateOne({
							approved: true,
							waitingForApproval: false,
						})

						const logChannel = interaction.guild.channels.cache.find((c: Channel) => {
							if (c.type === ChannelType.GuildText) {
								if (c.name === "template-approval-log") {
									return c
								}
							}
						})
						if (logChannel) {
							await (logChannel as TextChannel).send({
								content: `<@${approveUser.id}>`,
								embeds: [
									new EmbedBuilder()
										.setTitle('Template Approved')
										.setColor("Green")
										.setFooter({
											text: `NIGHTHAWK SERVERS Marketplace · Approved by ${interaction.user.username}`
										})
										.setTimestamp()
										.setDescription(`Your template for __${approvalTemplate.jobType.toLowerCase()}__ has been approved! You may now post to the marketplace.\n\nRun \`/post\` in https://discord.com/channels/489424959270158356/639874483301384223 to post!`)
								]
							}).catch((err) => {
								Log.error(err)
							})
						}

						const yourPostHasBeenApproved = new EmbedBuilder()
							.setAuthor({ name: `Template Approved!`, iconURL: interaction.guild.iconURL() || undefined })
							.setColor("Green")
							.setDescription(`Your template for __${approvalTemplate.jobType.toLowerCase()}__ has been approved! You may now post to the Marketplace! Run \`/post\` in https://discord.com/channels/489424959270158356/639874483301384223 again to post.\n\nWe very highly recommend the utilization of our [Middlemanning Services](https://discord.gg/qAsVfc22Bp); with a minimal 10% fee (negotiable for repeat users), we offer;\n\n- **In-depth verification** and research on your Freelancer / Employer prior to the job\n- **Active guidance and counselling** throughout the entire transaction\n- **Logging of the entire job** inside of our Middlemanning ticket system\n- A **guaranteed 100% payback** (custom tailored to every specific instance) in the event of a scam\n\n*Feel free to ping NoMula for any assistance you may need*`)
							.setTimestamp()
						await approveUser.send({ embeds: [yourPostHasBeenApproved] }).catch((err) => {
							Log.error(err)
						})

						const noteList2 = await UserMarketNote.find({
							userID: approvalTemplate.userID
						})
						await interaction.editReply({ content: `${config.successEmoji} This template in ${approvalTemplate.jobType} has been approved by ${interaction.user.username}.\n> **Template by:** ${approveUser.user.username} (${approveUser.user.id} <@${approveUser.user.id}>)\n${noteList2.length < 1 ? '' : `User has **${noteList2.length}** marketplace note(s)`}`, })

						break
					}
				case "approved_no":
					{
						if (!interaction.inCachedGuild()) return

						if (!interaction.member.roles.cache.hasAny("1480435906044362814", "1480436288296583228", "1480436503187423342", "1481021796298915972")) {
							interaction.reply({ content: `${config.failedEmoji} You do not have permission to do this.`, ephemeral: true })
							return
						}

						const approvalButtonsDisabledNo = new ActionRowBuilder<ButtonBuilder>()
							.addComponents(
								new ButtonBuilder()
									.setCustomId("approved_yes")
									.setLabel("Approve Template")
									.setStyle(ButtonStyle.Success)
									.setDisabled(true),
								new ButtonBuilder()
									.setCustomId("approved_no")
									.setLabel("Reject Template")
									.setStyle(ButtonStyle.Danger)
									.setDisabled(true),
								new ButtonBuilder()
									.setCustomId("approved_auto_reject")
									.setLabel("Auto Reject")
									.setStyle(ButtonStyle.Danger)
									.setDisabled(true),
								new ButtonBuilder()
									.setCustomId("approved_reverse_approval")
									.setLabel('Reverse Decision')
									.setStyle(ButtonStyle.Danger)

							)

						const approvalTemplateNo = await PostTemplates.findOne({
							approvalMessageID: interaction.message.id
						})
						if (!approvalTemplateNo) {
							interaction.update({ content: `${config.failedEmoji} No template found.`, embeds: [], components: [approvalButtonsDisabledNo as any] })
							return
						}


						const rejectForm = new ModalBuilder()
							.setCustomId("reject_form")
							.setTitle("Enter a reason for rejection")

						const rejectFormInput: TextInputBuilder[] = [
							new TextInputBuilder()
								.setCustomId("reject_form_reason")
								.setLabel("Reason for rejection")
								.setPlaceholder("Please enter a valid and detailed reason.")
								.setMaxLength(1500)
								.setRequired(false)
								.setStyle(TextInputStyle.Paragraph),
						]

						for (const arg of rejectFormInput) {
							rejectForm.addComponents(new ActionRowBuilder<TextInputBuilder>().setComponents(arg))
						}

					await interaction.showModal(rejectForm as any)
				break
			}
			case "approved_reverse_approval": {
				if (!interaction.inCachedGuild()) return

				if (!interaction.member.roles.cache.hasAny("1480435906044362814", "1480436288296583228", "1480436503187423342", "1481021796298915972")) {
					interaction.reply({ content: `${config.failedEmoji} You do not have permission to do this.`, ephemeral: true })
					return
				}

				Log.info(`${interaction.user.id} reversed template on message id ${interaction.message.id}`)

				const approvalReverseButtonsDisabled = new ActionRowBuilder<ButtonBuilder>()
					.addComponents(
						new ButtonBuilder()
							.setCustomId("approved_yes")
							.setLabel("Approve Template")
							.setStyle(ButtonStyle.Success)
							.setDisabled(true),
						new ButtonBuilder()
							.setCustomId("approved_no")
							.setLabel("Reject Template")
							.setStyle(ButtonStyle.Danger)
							.setDisabled(true),
						new ButtonBuilder()
							.setCustomId("approved_auto_reject")
							.setLabel("Auto Reject")
							.setStyle(ButtonStyle.Danger)
							.setDisabled(true),
						new ButtonBuilder()
							.setCustomId("approved_reverse_approval")
							.setLabel('Reverse Decision')
							.setStyle(ButtonStyle.Danger)

						)

				const approvalReverseButtons = new ActionRowBuilder<ButtonBuilder>()
					.addComponents(
						new ButtonBuilder()
							.setCustomId("approved_yes")
							.setLabel("Approve Template")
							.setStyle(ButtonStyle.Success)
							.setDisabled(false),
						new ButtonBuilder()
							.setCustomId("approved_no")
							.setLabel("Reject Template")
							.setStyle(ButtonStyle.Danger)
							.setDisabled(false),
						new ButtonBuilder()
							.setCustomId("approved_auto_reject")
							.setLabel("Auto Reject")
							.setStyle(ButtonStyle.Danger)
						)

				const approvalTemplateReverse = await PostTemplates.findOne({
					approvalMessageID: interaction.message.id
				})
				if (!approvalTemplateReverse) {
					interaction.update({ content: `${config.failedEmoji} No template found.`, embeds: [], components: [approvalReverseButtonsDisabled as any] })
					return
				}
				if (approvalTemplateReverse.waitingForApproval === true) {
					await (interaction.channel as TextChannel)?.send(`<@${interaction.user.id}> Failed to reverse decision; this may be because this is an older template.`).catch(() => { })
					return
				}

				const reverseUser = interaction.guild.members.cache.get(approvalTemplateReverse.userID)
				if (!reverseUser) {
					interaction.update({ content: `${config.failedEmoji} User has left the server. Failed to reverse decision.`, embeds: [], components: [approvalReverseButtonsDisabled as any] })
					await approvalTemplateReverse.updateOne({
						waitingForApproval: false,
						approvalMessageID: "",
						approved: false
					})
					return
				}

				Log.info(`Logging non-unique post template change for market mod ${interaction.user.id} on message ${interaction.message.id}`)
				await PostTemplateChanges.create({
					marketModerator: interaction.user.id,
					userId: reverseUser!.user.id,
					templateChannel: approvalTemplateReverse.jobType ?? "UNKNOWN",
					templateType: "REVERSE",
					templateCreatedAt: approvalTemplateReverse.createdAt,
					templateChangedAt: approvalTemplateReverse.updatedAt,

					isActionUnique: false
				})
				localPostTemplateCache.set(interaction.message.id, new Date())

				await interaction.update({
					content: `${config.loadingEmoji} Reversing decision...`
				})
				await approvalTemplateReverse.updateOne({
					waitingForApproval: true,
					approvalMessageID: interaction.message.id,
					approved: false
				})
				await reverseUser.send({
					embeds: [
						new EmbedBuilder()
							.setAuthor({ name: `Template Approval Reversed`, iconURL: interaction.guild.iconURL() || undefined })
							.setColor("Red")
							.setDescription(`Your template's status for ${approvalTemplateReverse.jobType.toLowerCase()} has been reversed, and is awaiting a decision.\n\nThis is likely due to staff error in approving your post.`)
							.setTimestamp()
					]
				}).catch(() => { })
				const noteList3 = await UserMarketNote.find({
					userID: approvalTemplateReverse.userID
				})
				await interaction.editReply({
					content: `Template in ${approvalTemplateReverse.jobType.toLowerCase()} by: ${reverseUser.user.username} (${reverseUser.user.id} <@${reverseUser.user.id}>)\nUser joined <t:${Math.round(reverseUser.joinedAt!.getTime() / 1000)}:R>\n${noteList3.length < 1 ? '' : `User has **${noteList3.length}** marketplace note(s)`}`,
					components: [approvalReverseButtons as any]
				})
				break
			}
				case "edit_extras":
					{
						if (!interaction.inCachedGuild()) return
						if (!interaction.member.roles.cache.find((r: Role) => r.name.toLowerCase().includes("booster")) || interaction.member.roles.cache.find((r: Role) => { r.name.toLowerCase() === "booster benefits pass" })) {
							interaction.reply({ content: "You must boost the server to access this.", ephemeral: true })
							return
						}

						const extrasForm = new ModalBuilder()
							.setCustomId("extras_form")
							.setTitle("Enter extra information")

						const extrasFormInput: TextInputBuilder[] = [
							new TextInputBuilder()
								.setCustomId("extra_form_title")
								.setLabel("Template title")
								.setPlaceholder("Enter a title for your template.")
								.setMaxLength(250)
								.setRequired(true)
								.setStyle(TextInputStyle.Short),
							new TextInputBuilder()
								.setCustomId("extra_form_color")
								.setLabel("Template embed color")
								.setPlaceholder("Enter a hex code")
								.setMaxLength(10)
								.setRequired(true)
								.setStyle(TextInputStyle.Short),
							new TextInputBuilder()
								.setCustomId("extra_form_footer")
								.setLabel("Template footer text")
								.setPlaceholder("Enter text for your footer")
								.setMaxLength(250)
								.setRequired(true)
								.setStyle(TextInputStyle.Short),
							new TextInputBuilder()
								.setCustomId("extra_form_icon")
								.setLabel("Template footer icon")
								.setPlaceholder("Enter a valid image URL")
								.setMaxLength(500)
								.setRequired(true)
								.setStyle(TextInputStyle.Short),
						]

						for (const arg of extrasFormInput) {
							extrasForm.addComponents(new ActionRowBuilder<TextInputBuilder>().setComponents(arg))
						}

					await interaction.showModal(extrasForm as any)
					const thisPost = await Post.findOne({
						messageId: interaction.message.id
					})
					if (!thisPost) {
						await interaction.reply({
							ephemeral: true,
							content: 'I can\'t find this post in our database. Please open a ticket for support.'
						})
						return
					}
					const postMember: GuildMember = await interaction.guild?.members.fetch(thisPost.userID).catch((err) => {
						Log.error(err)
					})! as GuildMember
					if (interaction.user.id !== thisPost.userID && !(interaction.member?.permissions as PermissionsBitField).has(PermissionFlagsBits.ManageMessages)) {
						await interaction.user.send(`The post you've tried to delete is not your own.`).catch(() => { })
						return
					} else if ((interaction.member!.roles! as GuildMemberRoleManager).cache.hasAny("1203900675965325332", "1138680448248188948")) {
						// staff deletion; invalidate post template
						const foundPostTemplate = await PostTemplates.findOne({
							userID: postMember.user.id,
							guildID: interaction.guildId,
							jobType: ((interaction.channel as TextChannel).name.toUpperCase().replace('-', '_'))
						})

						if (foundPostTemplate) {
							foundPostTemplate.approved = false
							foundPostTemplate.waitingForApproval = false
							await foundPostTemplate.save()
							await postMember.user.send(`Your post template for ${foundPostTemplate.jobType} has been invalidated by a staff member, and you will need to resubmit it for approval.`).catch((err) => {
								Log.error(err)
								return
							})
						};
					};
					await thisPost.deleteOne()
					await interaction.message.delete().catch((err) => {
						Log.error(err)
						return
					})

					await postMember.user.send(`Your post in <#${thisPost.jobChannelId}> has been deleted.`).catch((err) => {
						Log.error(err)
						return
					})
				}
					break
				case 'send_post': {
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
					const jobTypeSendPost = getJobType(interaction)
					if (!jobTypeSendPost)
						return
					const sendPostTemplate = await PostTemplates.findOne({
						guildID: interaction.guild?.id,
						userID: interaction.user.id,
						jobType: jobTypeSendPost,
					})
					if (!sendPostTemplate)
						return
					if (!sendPostTemplate.approved) {
						const templateEditor = await generateEmbed(sendPostTemplate, interaction.user, interaction.guild!)

						await interaction.update({ content: templateEditor.PostMessage, embeds: [templateEditor.PostEmbed], components: templateEditor.PostButtons.map(btn => btn as any) })
					}

					const serverSettings = await Settings.findOne({
						guildID: interaction.guildId
					})!

					let jobChannelId = ''
					switch (sendPostTemplate.jobType.toLowerCase()) {
						case 'hiring': {
							jobChannelId = serverSettings?.hiringChannel!
							break
						}
						case 'for_hire': {
							jobChannelId = serverSettings?.forHireChannel!
							break
						}
						case 'selling': {
							jobChannelId = serverSettings?.sellingChannel!
							break
						}
					}

					const jobChannel = await interaction.client.channels.fetch(jobChannelId)
					if (!jobChannel)
						return

					const isBooster = (interaction.member!.roles as GuildMemberRoleManager).cache.find((pre) => { return pre.name === "Epic Boosters" }) || (interaction.member!.roles as GuildMemberRoleManager).cache.find((r: Role) => { return r.name.toLowerCase() === "booster benefits pass" })

					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const recentPost: any = await Post.findOne({
						jobChannelId: jobChannel.id,
						userID: interaction.user.id
					}).sort({ createdAt: -1 })
					if (recentPost && (new Date().getTime() - recentPost.createdAt.getTime()) < (isBooster ? BOOSTER_COOLDOWN_DURATION : NON_BOOSTER_COOLDOWN_DURATION)) {
						const timeElapsed = new Date().getTime() - recentPost.createdAt.getTime()
						const timeRemaining = (isBooster ? BOOSTER_COOLDOWN_DURATION : NON_BOOSTER_COOLDOWN_DURATION) - timeElapsed
						const timeRemainingStr = timetostring(timeRemaining)

						await interaction.reply({
							ephemeral: true,
							content: `You are posting too quickly. Please wait ${timeRemainingStr} before posting again.` + (isBooster
								? `\n👑 **Booster Benefits** | Thanks for supporting NIGHTHAWK SERVERS! Your cooldown has been lowered by **${timetostring(NON_BOOSTER_COOLDOWN_DURATION - BOOSTER_COOLDOWN_DURATION)}** compared to regular members.`
								: `\n👑 **Boost the server** to set the cooldown expiration **<t:${Math.round((recentPost.createdAt.getTime() + BOOSTER_COOLDOWN_DURATION) / 1000)}:R>** (currently <t:${Math.round((recentPost.createdAt.getTime() + NON_BOOSTER_COOLDOWN_DURATION) / 1000)}:R>)`)
						})
						return
					}
					if (recentPost) {
						const thisChannel: TextChannel = await interaction.client.channels.fetch(recentPost.jobChannelId!) as TextChannel
						const thisMessage = await (thisChannel! as TextChannel).messages.fetch(recentPost.messageId!).catch((err) => {

						})
						const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
							new ButtonBuilder()
								.setCustomId('delete-post-yes')
								.setLabel('Delete My Post')
								.setStyle(ButtonStyle.Danger),
							new ButtonBuilder()
								.setCustomId('delete-post-no')
								.setLabel('No Thanks')
								.setStyle(ButtonStyle.Primary)
						)
						if (thisMessage) {
							const response = await interaction.reply({
								ephemeral: true,
								content: `You already have an [active post in that category](<https://www.discord.com/channels/${thisChannel.guild.id}/${thisChannel.id}/${thisMessage.id}>). Please delete it to make a new post.\n\nClick the button below to have me delete this post for you.`,
								components: [
									row as any
								],
								fetchReply: true
							})
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							const collectorFilter: any = (i: any) => i.user.id === interaction.user.id
							try {
								const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60000 })
								if (!confirmation)
									return
								if (confirmation.customId !== "delete-post-yes") {
									await interaction.editReply({
										content: `Ok, I won't delete your post.`,
										embeds: [],
										components: []
									})
									return
								}

								await recentPost.deleteOne()
								await thisMessage.delete().catch(async (e) => {
									await interaction.editReply(`Failed to delete post message. Please open a ticket with a screenshot of this message!`)
									Log.error(`User ${interaction.user.id} failed to auto-delete post message`)
									Log.error(e)
								})
								await interaction.editReply({
									content: `I've deleted your post. Run \`/post\` again.`,
									embeds: [],
									components: []
								})
							} catch (err) {
								row.components[0].setDisabled(true)
								row.components[1].setDisabled(true)
								await interaction.editReply({ components: [row as any] })
								Log.error(err)
							}
							return
						}
					}

					let postColor = sendPostTemplate.embedColor! ?? Colors.Green
					let postAuthorText = sendPostTemplate.author ?? interaction.user.tag
					let postFooterText = "NIGHTHAWK SERVERS Marketplace"
					let postFooterImage: string | undefined = interaction.user.avatarURL()!
					if (sendPostTemplate.footer) {
						postFooterText = sendPostTemplate.footer.text ?? "NIGHTHAWK SERVERS Marketplace"
						postFooterImage = sendPostTemplate.footer.icon ?? undefined
						if (postFooterImage && postFooterImage.length < 1) {
							postFooterImage = undefined
						};
					};

					if (!(interaction.member!.roles as unknown as GuildMemberRoleManager).cache?.find((r: Role) => r.name.toLowerCase().includes("booster")) && !((interaction.member!.roles as GuildMemberRoleManager).cache.find((r: Role) => r.name.toLowerCase() === "booster benefits pass"))) {
						if (sendPostTemplate.embedColor !== "Green" || sendPostTemplate.author !== interaction.user.username || sendPostTemplate.footer?.text !== "NIGHTHAWK SERVERS Marketplace" || sendPostTemplate.footer?.icon !== interaction.user.avatarURL()) {
							await (interaction.member! as GuildMember).user!.send({
								embeds: [
									new EmbedBuilder()
										.setTitle('Booster Privileges Lost')
										.setDescription('It seems like your post contains extra content that is only available to our boosters. Don\'t worry though, your extra data is still here, and can be posted by boosting again.')
										.setColor("Red")
								]
							}).catch(() => {

							})
						}
						postColor = "Green"
						postAuthorText = interaction.user.tag
						postFooterText = "NIGHTHAWK SERVERS Marketplace"
						postFooterImage = interaction.user.avatarURL()!
					}

					if (postFooterImage === "")
						postFooterImage = undefined
					
					const rankedRoles = await getRankedRoles(interaction.member as GuildMember)

					const postEmbed = new EmbedBuilder()
						.setColor(postColor as ColorResolvable)
						.setTitle(jobTypeSendPost)
						.setThumbnail(sendPostTemplate.thumbnail! ?? undefined)
						.setAuthor({
							name: postAuthorText,
							iconURL: interaction.user.avatarURL()!
						})
						.setDescription(sendPostTemplate.description!)
						.addFields(
							{
								name: 'Payment',
								value: `**Robux:** ${sendPostTemplate.payment?.robux || "N/A"}
**Real Money:** ${sendPostTemplate.payment?.money || "N/A"}
**Other:** ${sendPostTemplate.payment?.other || "N/A"}`
							},
							{
								name: 'Contact',
								value: `Discord: <@${interaction.user.id}>`
							},
						)
						.setFooter({
							text: postFooterText,
							iconURL: postFooterImage
						})

					if (rankedRoles !== null) {
						postEmbed.addFields(
							{
								name: 'Ranks',
								value: `Ranked ${rankedRoles}`
							}
						)
					}

					if (sendPostTemplate.talentHubLink) {
						postEmbed.addFields(
							{
								name: 'Talent Hub',
								value: sendPostTemplate.talentHubLink,
								inline: true
							}
						)
					}

					if (sendPostTemplate.image) {
						try {
							if (!/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/g.test(sendPostTemplate.image))
								throw 'Invalid image url'
							postEmbed.setImage(sendPostTemplate.image)
						} catch (err) {
							await interaction.editReply('❌FAILED: Please specify a valid URL for your image, or **leave the prompt blank**. Cancelling...')
							return
						}
					}

					for (const blacklistedChar of ILLEGAL_CHAR_BLACKLIST) {
						if (sendPostTemplate.description!.toLowerCase().match(blacklistedChar) !== null) {
							await interaction.update({
								content: `${config.failedEmoji} Your requested post has been denied: illegal character used ("${blacklistedChar}"). If you'd like to dispute this block, please open a ticket. Edit your post description without this character used.`,
								components: [],
								embeds: []
							})
							return
						}
						let matches = false
						if ((sendPostTemplate.payment?.robux ?? "").toLowerCase().match(blacklistedChar) !== null)
							matches = true
						if ((sendPostTemplate.payment?.money ?? "").toLowerCase().match(blacklistedChar) !== null)
							matches = true
						if ((sendPostTemplate.payment?.other ?? "").toLowerCase().match(blacklistedChar) !== null)
							matches = true
						if (matches) {
							await interaction.update({
								content: `${config.failedEmoji} Your requested post has been denied: illegal character used ("${blacklistedChar}"). If you'd like to dispute this block, please open a ticket. Edit your post payments without this character used.`,
								components: [],
								embeds: []
							})
							return
						}
					}

					try {
						const row2 = new ActionRowBuilder()
							.addComponents(
								new ButtonBuilder()
									.setCustomId('delete')
									.setLabel('Delete Post')
									.setStyle(ButtonStyle.Danger)
							)

						const embeds = [
							postEmbed
						]
						const jobMessage = await (jobChannel as TextChannel).send({
							content: `<@${interaction.user.id}>`,
							embeds: embeds,
						components: [(row2 as any)]
					}).catch(() => { })

					await Post.create({
							messageId: (jobMessage as Message<boolean>).id,
							postTemplateReference: sendPostTemplate._id
						})

						await interaction.update({
							content: `<@${interaction.user.id}>, your template has been posted to ${jobTypeSendPost}.`,
							embeds: [],
							components: []
						})
					} catch (err) {
						Log.error(err)
						await interaction.reply('❌FAILED: Please contact an Administrator for assistance.')
					}
				}
			}

		} else if (interaction.isModalSubmit() && interaction.isFromMessage()) {

			const id = interaction.customId

			switch (id) {
				case "job_description_modal": /*  ~ Job Description Modal ~ */
					{
						if (!interaction.inCachedGuild()) {
							return
						}

						const jobType = getJobType(interaction)
						if (!jobType) {
							interaction.update({ content: `${config.failedEmoji} Unable to find valid job type! If this error persists, please contact a bot developer.`, embeds: [], components: [] })
							return
						}

						await interaction.update({ content: `${config.loadingEmoji} Updating job post description...` })

						const description = interaction.fields.getTextInputValue("job_description")
						if (!description) {
							await interaction.update({ content: `${config.failedEmoji} Unable to find job description you input! Please try again. If this error persists please contact a bot developer.`, embeds: [], components: [] })
							return
						}

						for (const blacklistedChar of ILLEGAL_CHAR_BLACKLIST) {
							if (description.toLowerCase().match(blacklistedChar) !== null) {
								await interaction.update({
									content: `${config.failedEmoji} Your requested post edit has been denied: illegal character used ("${blacklistedChar}"). If you'd like to dispute this block, please open a ticket. Rerun /post.`,
									components: [],
									embeds: []
								})
								return
							}
						}

						await PostTemplates.findOneAndUpdate({
							guildID: interaction.guild?.id,
							userID: interaction.user.id,
							jobType: jobType,
						}, {
							description: description,
							approved: (interaction.member.roles.cache.hasAny("1257205848665489468", "1257206288111370281")),
						})
						const foundTemplateDesc = await PostTemplates.findOne({
							guildID: interaction.guild?.id,
							userID: interaction.user.id,
							jobType: jobType,
						})
						if (!foundTemplateDesc) {
							await interaction.editReply({ content: `${config.failedEmoji} That"s odd... Your post template is missing! Please try again.`, embeds: [], components: [] })
							return
						}
						const postMessageDescription = await generateEmbed(foundTemplateDesc, interaction.user, interaction.guild)

						await interaction.editReply({ embeds: [postMessageDescription.PostEmbed], content: postMessageDescription.PostMessage, components: postMessageDescription.PostButtons.map(btn => btn as any) })
						break
					}
				case "talent_hub_modal": /*  ~ Talent Hub Modal ~ */
					{
						if (!interaction.inCachedGuild()) {
							return
						}

						const jobTypeTalent = getJobType(interaction)
						if (!jobTypeTalent) {
							interaction.update({ content: `${config.failedEmoji} Unable to find valid job type! If this error persists, please contact a bot developer.`, embeds: [], components: [] })
							return
						}

						const uri = interaction.fields.getTextInputValue("talent_hub_url") || ""
						const matched = TALENT_HUB_REGEX.exec(uri)
						if (!matched || matched.length < 1) {
							interaction.update({ content: `${config.failedEmoji} Invalid talent hub URL! See the example in the popup`, embeds: [], components: [] })
							return
						}

						await PostTemplates.findOneAndUpdate({
							guildID: interaction.guild?.id,
							userID: interaction.user.id,
							jobType: jobTypeTalent,
						}, {
							talentHubLink: matched[0] || "",
							approved: (interaction.member.roles.cache.hasAny("1257205848665489468", "1257206288111370281")),
						})
						const foundTemplateTalent = await PostTemplates.findOne({
							guildID: interaction.guild?.id,
							userID: interaction.user.id,
							jobType: jobTypeTalent,
						})
						if (!foundTemplateTalent) {
							await interaction.update({ content: `${config.failedEmoji} That's odd... Your post template is missing! Please try again.`, embeds: [], components: [] })
							return
						}
						const postMessageTalent = await generateEmbed(foundTemplateTalent, interaction.user, interaction.guild)

						await interaction.update({ embeds: [postMessageTalent.PostEmbed], content: postMessageTalent.PostMessage, components: postMessageTalent.PostButtons.map(btn => btn as any) }); break
					}

				case "job_payment_modal": /*  ~ Job Payment Form ~ */
					{
						if (!interaction.inCachedGuild()) {
							return
						}

						const jobTypePayment = getJobType(interaction)
						if (!jobTypePayment) {
							interaction.update({ content: `${config.failedEmoji} Unable to find valid job type! If this error persists, please contact a bot developer.`, embeds: [], components: [] })
							return
						}


						const paymentRobux = interaction.fields.getTextInputValue("job_payment_robux") || "NONE SET"
						const paymentMoney = interaction.fields.getTextInputValue("job_payment_money") || "NONE SET"
						const paymentOther = interaction.fields.getTextInputValue("job_payment_other") || "NONE SET"
						if (paymentRobux == "NONE SET" && paymentMoney == "NONE SET" && paymentOther == "NONE SET") {
							interaction.reply({ content: `${config.failedEmoji} Invalid payment details input! If this error persists, please contact a bot developer. No changes were made.`, ephemeral: true })
							return
						}
						await interaction.update({ content: `${config.loadingEmoji} Updating job post payment details...` })

						for (const blacklistedChar of ILLEGAL_CHAR_BLACKLIST) {
							let matches = false
							if (paymentRobux.toLowerCase().match(blacklistedChar) !== null)
								matches = true
							if (paymentMoney.toLowerCase().match(blacklistedChar) !== null)
								matches = true
							if (paymentMoney.toLowerCase().match(blacklistedChar) !== null)
								matches = true
							if (matches) {
								await interaction.update({
									content: `${config.failedEmoji} Your requested post edit has been denied: illegal character used ("${blacklistedChar}"). If you'd like to dispute this block, please open a ticket. Rerun /post.`,
									components: [],
									embeds: []
								})
								return
							}
						}

						await PostTemplates.findOneAndUpdate({
							guildID: interaction.guild?.id,
							userID: interaction.user.id,
							jobType: jobTypePayment,
						}, {
							payment: {
								robux: paymentRobux,
								money: paymentMoney,
								other: paymentOther,
							},
							approved: (interaction.member.roles.cache.hasAny("1257205848665489468", "1257206288111370281")),
						})
						const foundTemplatePayment = await PostTemplates.findOne({
							guildID: interaction.guild?.id,
							userID: interaction.user.id,
							jobType: jobTypePayment,
						})
						if (!foundTemplatePayment) {
							await interaction.editReply({ content: `${config.failedEmoji} That's odd... Your post template is missing! Please try again.`, embeds: [], components: [] })
							return
						}
						const postMessagePayment = await generateEmbed(foundTemplatePayment, interaction.user, interaction.guild)

						await interaction.editReply({ embeds: [postMessagePayment.PostEmbed], content: postMessagePayment.PostMessage, components: postMessagePayment.PostButtons.map(btn => btn as any) }); break
					}
				case "job_images_modal": /*  ~ Job Image Modal ~ */

					{
						if (!interaction.inCachedGuild()) {
							return
						}

						const jobTypeImages = getJobType(interaction)
						if (!jobTypeImages) {
							interaction.update({ content: `${config.failedEmoji} Unable to find valid job type! If this error persists, please contact a bot developer.`, embeds: [], components: [] })
							return
						}

						const postImage = interaction.fields.getTextInputValue("job_image")
						const postThumbnail = interaction.fields.getTextInputValue("job_thumbnail")

						if (!postImage && !postThumbnail) {
							interaction.reply({ content: `${config.failedEmoji} Invalid image URLs provided. No changes were made.` })
							return
						}

						if (postImage) {
							if (!isValidUrl(postImage)) {
								interaction.reply({ content: `${config.failedEmoji} Invalid image URL provided.` })
								return
							}
						}

						if (postThumbnail) {
							if (!isValidUrl(postThumbnail)) {
								interaction.reply({ content: `${config.failedEmoji} Invalid thumbnail URL provided.` })
								return
							}
						}

						await interaction.update({ content: `${config.loadingEmoji} Updating job post images...` })

						await PostTemplates.findOneAndUpdate({
							guildID: interaction.guild?.id,
							userID: interaction.user.id,
							jobType: jobTypeImages,
						}, {
							image: postImage || undefined,
							thumbnail: postThumbnail || undefined,
							approved: (interaction.member.roles.cache.hasAny("1257205848665489468", "1257206288111370281")),
						})
						const foundTemplateImages = await PostTemplates.findOne({
							guildID: interaction.guild?.id,
							userID: interaction.user.id,
							jobType: jobTypeImages,
						})
						if (!foundTemplateImages) {
							await interaction.editReply({ content: `${config.failedEmoji} That's odd... Your post template is missing! Please try again.`, embeds: [], components: [] })
							return
						}

						const postMessageImages = await generateEmbed(foundTemplateImages, interaction.user, interaction.guild)

						await interaction.editReply({ embeds: [postMessageImages.PostEmbed], content: postMessageImages.PostMessage, components: postMessageImages.PostButtons.map(btn => btn as any) })

						break
					}
				case "reject_form": /*  ~ Reject Form ~ */
					{
						if (!interaction.inCachedGuild()) return

						if (!interaction.member.roles.cache.hasAny("1480435906044362814", "1480436288296583228", "1480436503187423342", "1481021796298915972")) {
							interaction.reply({ content: `${config.failedEmoji} You do not have permission to do this.`, ephemeral: true })
							return
						}

						const rejectReason = interaction.fields.getTextInputValue("reject_form_reason")

						const postRejectedButtons = new ActionRowBuilder<ButtonBuilder>()
							.addComponents(
								new ButtonBuilder()
									.setCustomId("approved_yes")
									.setLabel("Approve Template")
									.setStyle(ButtonStyle.Success)
									.setDisabled(true),
								new ButtonBuilder()
									.setCustomId("approved_no")
									.setLabel("Reject Template")
									.setStyle(ButtonStyle.Danger)
									.setDisabled(true),
								new ButtonBuilder()
									.setCustomId("approved_reverse_approval")
									.setLabel('Reverse Decision')
									.setStyle(ButtonStyle.Danger),
								new ButtonBuilder()
									.setCustomId("approved_auto_reject")
									.setLabel("Auto Reject")
									.setStyle(ButtonStyle.Danger)
									.setDisabled(true)

							)


						const templateRej = await PostTemplates.findOne({
							approvalMessageID: interaction.message.id
						})
						if (!templateRej) {
							interaction.update({ content: `${config.failedEmoji} No template found.`, embeds: [], components: [postRejectedButtons as any] })
							return
						}
						if (templateRej.approved === true) {
							return
						}

						const approveUser = interaction.guild.members.cache.get(templateRej.userID)
						if (!approveUser) {
							interaction.update({ content: `${config.failedEmoji} User has left the server. Automatically declining template.`, embeds: [], components: [postRejectedButtons as any] })
							await templateRej.updateOne({
								waitingForApproval: false,
							})
							return
						}

						const postTemplateCache = localPostTemplateCache.get(interaction.message.id)
						if (postTemplateCache) {
							Log.info(`Logging non-unique post template change for market mod ${interaction.user.id} on message ${interaction.message.id}`)
							await PostTemplateChanges.create({
								marketModerator: interaction.user.id,
								userId: approveUser!.user.id,
								templateChannel: templateRej.jobType ?? "UNKNOWN",
								templateType: "REJECT",
								reason: rejectReason,
								templateCreatedAt: templateRej.createdAt,
								templateChangedAt: templateRej.updatedAt,

								isActionUnique: false
							})
						} else {
							Log.info(`Logging unique post template change for market mod ${interaction.user.id} on message ${interaction.message.id}`)
							await PostTemplateChanges.create({
								marketModerator: interaction.user.id,
								userId: approveUser!.user.id,
								templateChannel: templateRej.jobType ?? "UNKNOWN",
								templateType: "REJECT",
								reason: rejectReason,
								templateCreatedAt: templateRej.createdAt,
								templateChangedAt: templateRej.updatedAt,

								isActionUnique: true
							})
							localPostTemplateCache.set(interaction.message.id, new Date())
						}

						const logChannel = interaction.guild.channels.cache.find((c: Channel) => {
							if (c.type === ChannelType.GuildText) {
								if (c.name === "template-approval-log") {
									return c
								}
							}
						})
						if (logChannel) {
							await (logChannel as TextChannel).send({
								content: `<@${approveUser.id}>`,
								embeds: [
									new EmbedBuilder()
										.setTitle('Template Rejected')
										.setColor("Red")
										.setFooter({
											text: `NIGHTHAWK SERVERS Marketplace`
										})
										.setTimestamp()
										.setDescription(`Your template for __${templateRej.jobType.toLowerCase()}__ has been rejected! Please make edits to your template and resubmit for approval.\n\n${config.bulletpointEmoji} **Rejection Reason:** ${rejectReason}`)
								]
							}).catch((err) => {
								Log.error(err)
							})
						}

						await interaction.update({ content: `${config.loadingEmoji} Rejecting template...`, components: [postRejectedButtons as any] })

						await templateRej.updateOne({
							approved: false,
							waitingForApproval: false,
						}).catch((err) => {
							Log.error(err)
						})

						const yourPostHasBeenApproved = new EmbedBuilder()
							.setAuthor({ name: `Template Rejected!`, iconURL: interaction.guild.iconURL() || undefined })
							.setColor("Red")
							.setDescription(`Your template for ${templateRej.jobType.toLowerCase()} has been rejected! Please make edits to your template and resubmit for review.
						${config.bulletpointEmoji} **Reason:** ${rejectReason}`)
							.setTimestamp()
						await approveUser.send({ embeds: [yourPostHasBeenApproved] }).catch((err) => {
							Log.error(err)
						})
						await interaction.editReply({ content: `${config.failedEmoji} This template in ${templateRej.jobType} has been rejected by ${interaction.user.username}.\n> **Template by:** ${approveUser.user.username} (${approveUser.user.id} <@${approveUser.user.id}>)\n> **Reason:** ${rejectReason}`, })
						break
					}
				case "extras_form":
					{
						if (!interaction.inCachedGuild()) {
							return
						}

						const jobTypeExtras = getJobType(interaction)
						if (!jobTypeExtras) {
							interaction.update({ content: `${config.failedEmoji} Unable to find valid job type! If this error persists, please contact a bot developer.`, embeds: [], components: [] })
							return
						}

						const templateTitle = interaction.fields.getTextInputValue("extra_form_title")
						const templateColor = interaction.fields.getTextInputValue("extra_form_color")
						const templateFooter = interaction.fields.getTextInputValue("extra_form_footer")
						const templateIcon = interaction.fields.getTextInputValue("extra_form_icon")
						await interaction.update({ content: `${config.loadingEmoji} Validating input details...` })

						if (templateIcon) {
							if (!isValidUrl(templateIcon)) {
								interaction.editReply({ content: `${config.failedEmoji} Invalid image URL provided.`, embeds: [], components: [] })
								return
							}
						}

						if (templateColor) {
							if (!/^#[0-9A-F]{6}$/i.test(templateColor)) {
								interaction.editReply({ content: `${config.failedEmoji} Invalid hex code provided.`, embeds: [], components: [] })
								return
							}
						}

						await PostTemplates.findOneAndUpdate({
							guildID: interaction.guild?.id,
							userID: interaction.user.id,
							jobType: jobTypeExtras,
						}, {
							footer: {
								text: templateFooter || "",
								icon: templateIcon || "",
							},
							author: templateTitle || "",
							embedColor: templateColor || "",
							approved: (interaction.member.roles.cache.hasAny("1257205848665489468", "1257206288111370281")),
						})
						const foundTemplateExtras = await PostTemplates.findOne({
							guildID: interaction.guild?.id,
							userID: interaction.user.id,
							jobType: jobTypeExtras,
						})
						if (!foundTemplateExtras) {
							await interaction.editReply({ content: `${config.failedEmoji} That's odd... Your post template is missing! Please try again.`, embeds: [], components: [] })
							return
						}
						await interaction.editReply({ content: `${config.loadingEmoji} Changes made! Sending you back to post editor...` })
						const postMessageExtras = await generateEmbed(foundTemplateExtras, interaction.user, interaction.guild)

						await interaction.editReply({ embeds: [postMessageExtras.PostEmbed], content: postMessageExtras.PostMessage, components: postMessageExtras.PostButtons.map(btn => btn as any) })


						break
					}
			}

		}

	}
}

function getJobType(interaction: ButtonInteraction | ModalSubmitInteraction): string | undefined {
	if (!interaction.message) {
		return undefined
	}
	let jobType
	if (interaction.message.content.includes("hiring")) {
		jobType = "HIRING"
	} else if (interaction.message.content.includes("for_hire")) {
		jobType = "FOR_HIRE"
	} else if (interaction.message.content.includes("selling")) {
		jobType = "SELLING"
	} else {
		return undefined
	}
	return jobType
}

export async function generateNoteCreateInterface(note: UserMarketNoteType, user: User, guild: Guild) {
	const parsedTemplates = JSON.parse(note.attachedTemplates)
	const parsedTags = JSON.parse(note.tags)
	let attachedString = ''
	let i = 1
	for (const temp of parsedTemplates) {
		attachedString += `\n**Snapshot ${i}** \`${temp.jobType}\``
		i++
	}
	const embed = new EmbedBuilder()
		.setTitle(`New note for ${user.username}`)
		.setColor("Green")
		.setDescription(`${(note.description ?? 'No description has been set yet.').substring(0, 4000)}`
			+ `\n\n**${parsedTemplates.length}** post template snapshots are attached\n${parsedTemplates.length > 0 ? attachedString : ''}`
		)
		.setFooter({
			text: `Tags: ${parsedTags.join(', ')}`
		})

	const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId('note-create-cancel')
			.setLabel('Cancel')
			.setStyle(ButtonStyle.Danger),
		new ButtonBuilder()
			.setCustomId('note-create-save')
			.setLabel('Save')
			.setStyle(ButtonStyle.Success)
	)

	const buttons2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId('note-create-attach-template-snapshot')
			.setLabel('Attach Template Snapshot')
			.setStyle(ButtonStyle.Primary)
	)

	return [embed, [buttons, buttons2]]
}

export async function generateNotesInterface(template: PostTemplateType, user: User, guild: Guild) {
	const notes = await UserMarketNote.find({
		userID: user.id
	})
	let notesString = ""
	for (const note of notes) {
		notesString += `\`${note._id}\`\n> ${(note.description ?? 'No description set').substring(0, 49)}${(note.description ?? 'No description set').length >= 50 ? '...' : ''}\n\n`
	}

	const embed = new EmbedBuilder()
		.setTitle(`${user.username}'s Marketplace Notes`)
		.setDescription(
			`<@${user.id}> has **${notes.length}** Marketplace Note(s).`
			+ `\n${notesString}`
		)
		.setColor("Green")

	const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId('note_create')
			.setLabel('Create Note')
			.setStyle(ButtonStyle.Primary),
	)
	const selectMenu = new StringSelectMenuBuilder()
	const menu = new ActionRowBuilder<StringSelectMenuBuilder>()
	const components: StringSelectMenuOptionBuilder[] = []

	for (const note of notes) {
		components.push(new StringSelectMenuOptionBuilder()
			.setLabel(note._id.toString())
			.setDescription((note.description ?? 'No description set').substring(0, 34))
			.setValue(`note_select` + note._id)
		)
	}
	selectMenu.addOptions(components)
	selectMenu.setCustomId('note_select_menu')
	menu.addComponents(selectMenu)

	return [embed, menu, buttons]
}

export async function generateEmbed(template: PostTemplateType, user: User, guild: Guild, forPost?: boolean): Promise<{ PostEmbed: EmbedBuilder; PostMessage: string; PostButtons: ActionRowBuilder<ButtonBuilder>[]; }> {
	const settings = await Settings.findOne({
		guildID: guild.id
	})
	let postEmoji = config.successEmoji
	let issuesFound = 0
	let postIssues = ``
	if (!template.description) {
		issuesFound++
		postIssues = postIssues + "\n> No description sent."
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
	let embed = new EmbedBuilder()
		.setAuthor({ name: template.author || `${user.username} | Edit this by boosting! (Will not show once posted)`, iconURL: user.displayAvatarURL() || undefined })
		.setColor(template.embedColor as ColorResolvable ?? Colors.Green)
		.setDescription(template.description || "No description set! Make sure to add as much detail as possible.")
		.addFields({ name: "Payment", value: `**Robux:** ${template.payment.robux || "NONE SET"}\n**Money:** ${template.payment.money || "NONE SET"}\n**Other:** ${template.payment.other || "NONE SET"}` })
		.setThumbnail(template.thumbnail || null)
		.setImage(template.image || null)
		.setFooter({ text: template.footer.text || "None set | Edit this with by boosting! (Will not show once posted)", iconURL: template.footer.icon || undefined })
	if (template.talentHubLink) {
		embed.addFields(
			{ name: 'Talent Hub', value: template.talentHubLink, inline: true }
		)
	}
	if (forPost == true) {
		embed = new EmbedBuilder()
			.setAuthor({ name: template.author || `${user.username} post in ${template.jobType ?? 'Unknown'}`, iconURL: user.displayAvatarURL() || undefined })
			.setColor(template.embedColor as ColorResolvable ?? Colors.Green)
			.setDescription(template.description || "If this is not set, please reject the approval.")
			.addFields({ name: "Payment", value: `**Robux:** ${template.payment.robux || "NONE SET"}\n**Money:** ${template.payment.money || "NONE SET"}\n**Other:** ${template.payment.other || "NONE SET"}` })
			.setThumbnail(template.thumbnail || null)
			.setImage(template.image || null)
		if (template.talentHubLink) {
			embed.addFields(
				{ name: 'Talent Hub', value: template.talentHubLink, inline: true }
			)
		}
		if (template.footer.text) {
			if (template.footer.text.length < 1) {
				// Do nothing
			} else {
				embed.setFooter({ text: template.footer.text, iconURL: (template.footer.icon === "" ? undefined : template.footer.icon) })
			}
		}

		// Add in tags embed
		const rawTemplateTags = BigInt(template.bitwiseTags ?? 0);
		const finalPostTags: string[] = [];

		for (const tagGroup in TagAssociation) {
			const association = TagAssociation[tagGroup];
			for (const [tagName, tagBitValue] of Object.entries(association)) {
				if ((rawTemplateTags & BigInt(tagBitValue as any)) !== BigInt(0)) {
					finalPostTags.push(tagName);
				}
			}
		}

		embed.addFields({
			name: `Tags`,
			value: `\`\`\`\n- ${finalPostTags.join('\n- ')}\n\`\`\``,
		});
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
	if (issuesFound > 1 && template.approved == false && settings?.requirePostApproval == true) {
		templateRow.components[0].setDisabled(true)
	}
	if (issuesFound > 0 && settings?.requirePostApproval == false) {
		templateRow.components[0].setDisabled(true)
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
	if (forPost === true) {
		const noteList = await UserMarketNote.find({
			userID: user.id
		})
		if (noteList.length > 0) {
			message += `\nUser has **${noteList.length}** market note(s).`
		}
	}
	if (issuesFound > 0) {
		message = message + `\n${postIssues}`
	}

	return { PostEmbed: embed, PostMessage: message, PostButtons: [templateRow, templateRowSecondary, templateRowPrem] }
}

function isValidUrl(str: string) {
	const pattern = new RegExp(
		'^([a-zA-Z]+:\\/\\/)?' + // protocol
		'((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
		'((\\d{1,3}\\.){3}\\d{1,3}))' + // OR IP (v4) address
		'(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
		'(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
		'(\\#[-a-z\\d_]*)?$', // fragment locator
		'i'
	)
	return pattern.test(str)
}
