import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, Channel, ChannelType, EmbedBuilder, Events, Interaction, ModalBuilder, Role, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextChannel, TextInputBuilder, TextInputStyle } from "discord.js"
import { config } from "../../utils/config"
import { resolveTemplateFromContent, validateOwnership } from "../../utils/queue"
import { attemptRegeneration, defaultQueueInterfaceRows } from '../../commands/slash/staff/QueueCommands'
import PostTemplateChanges from "../../schemas/PostTemplateChanges"
import { EventOptions } from "../../utils/RegisterEvents"
import { client } from "../../Core"
import { Log } from "../../utils/logging"
import { addBwTag, stripBwTag, TagAssociation } from "../../utils/BitwiseTagHelpers"
import { generateEmbed } from "./PostButton"

const localPostTemplateCache = new Map<string, Date>()

export default {
	name: Events.InteractionCreate,
	once: false,
	async execute(_: EventOptions, interaction: Interaction) {
		if (!interaction.inCachedGuild())
			return

		if (interaction.isModalSubmit()) {
			if (!interaction.isFromMessage())
				return
			switch (interaction.customId) {
				case 'reject_form_queue': {
					await interaction.deferUpdate()
					const resolvedPost = await resolveTemplateFromContent((interaction as any).message.content)
					if (!resolvedPost || !validateOwnership(resolvedPost!._id as unknown as string, interaction.user.id)) {
						attemptRegeneration(interaction)
						return
					}
					const resolvedPostId = resolvedPost!._id as unknown as string

					const postTemplateCache = localPostTemplateCache.get(resolvedPostId)
					if (postTemplateCache) {
						await PostTemplateChanges.create({
							marketModerator: interaction.user.id,
							userId: resolvedPost.userID,
							templateChannel: resolvedPost.jobType ?? "UNKNOWN",
							templateType: "REJECT",
							templateCreatedAt: resolvedPost.createdAt,
							templateChangedAt: resolvedPost.updatedAt,
							isActionUnique: false
						})
					} else {
						await PostTemplateChanges.create({
							marketModerator: interaction.user.id,
							userId: resolvedPost.userID,
							templateChannel: resolvedPost.jobType ?? "UNKNOWN",
							templateType: "REJECT",
							templateCreatedAt: resolvedPost.createdAt,
							templateChangedAt: resolvedPost.updatedAt,
							isActionUnique: true
						})
						localPostTemplateCache.set(resolvedPostId, new Date())
					}
					await resolvedPost.updateOne({
						approved: false,
						waitingForApproval: false,
						isQueueServed: false
					})
					const logChannel = interaction.guild.channels.cache.find((c: Channel) => {
						if (c.type === ChannelType.GuildText) {
							if (c.name === "template-approval-log") {
								return c
							}
						}
					})
					const rejectionEmbed = new EmbedBuilder()
						.setTitle('Template Rejected')
						.setColor("Red")
						.setFooter({
							text: `NIGHTHAWK SERVERS Marketplace · Rejected by ${interaction.user.username}`
						})
						.setTimestamp()
						.setDescription(`Your template for __${resolvedPost.jobType.toLowerCase()}__ has been rejected. Please make any necessary changes and submit again.\n**Rejection Reason**:\n>>> ${interaction.fields.getTextInputValue("reject_reason") ?? "Unknown reason"}`)
					const userToSend = await client.users.fetch(resolvedPost.userID).catch(() => { })
					if (userToSend) {
						await userToSend.send({
							embeds: [
								rejectionEmbed
							]
						}).catch(() => { })
					}
					if (logChannel) {
						await (logChannel as TextChannel).send({
							content: `<@${resolvedPost.userID}>`,
							embeds: [
								rejectionEmbed
							]
						}).catch((err) => { })
					}
					attemptRegeneration(interaction)
					return
					break
				}
			}
			return
		}
		if (interaction.isStringSelectMenu()) {
			if (interaction.customId.startsWith("tag-select")) {
				const resolvedPost = await resolveTemplateFromContent((interaction as any).message.content)!
				const freezeTemplateTags = BigInt(resolvedPost?.bitwiseTags ?? 0)
				let newTemplateTags: bigint = freezeTemplateTags as any

				const tagGroup = interaction.customId.split("-")[2] // format is "tag-select-<tagGroup>"

				for (const [tempTagName, tempTagBits] of Object.entries((TagAssociation as any)[tagGroup])) {
					// Check if interaction has this tag selected
					let found = false
					for (const val of interaction.values) {
						if (tempTagName === (val.split('~')[1])) {
							found = true
							break
						}
					}

					// Now we know if the current tag is selected by the MM, now we need to check if it's already in the template data
					if ((freezeTemplateTags & BigInt(tempTagBits! as unknown as any) as bigint) !== BigInt(0)) {
						if (!found) {
							// MM deselected tag; remove from data
							newTemplateTags = stripBwTag(newTemplateTags, tempTagBits! as bigint)
						}
					} else {
						if (found) {
							// MM selected tag; add to data
							newTemplateTags = addBwTag(newTemplateTags, tempTagBits! as bigint)
						}
					}
				}

				console.log(freezeTemplateTags, newTemplateTags)
				if (freezeTemplateTags !== newTemplateTags) {
					resolvedPost!.bitwiseTags = newTemplateTags
					await resolvedPost!.save()
				}

				await interaction.update({
					embeds: [
						(await generateEmbed(resolvedPost!, (await client.users.fetch(resolvedPost!.userID).catch(() => { }))!, interaction.guild, true)).PostEmbed
					],
					components: defaultQueueInterfaceRows as any
				})

				return
			}
			if (interaction.customId === "tag-group-select") {
				const resolvedPost = await resolveTemplateFromContent((interaction as any).message.content)
				const tagGroup = interaction.values[0]!
				await interaction.update({
					components: [
						new ActionRowBuilder<ButtonBuilder>().addComponents(
							new ButtonBuilder()
								.setCustomId('tag-group-select-back')
								.setLabel('Go Back')
								.setStyle(ButtonStyle.Danger)
						),
						new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
							new StringSelectMenuBuilder()
								.setCustomId('tag-select-' + tagGroup)
								.setMinValues(0)
								.setMaxValues(Object.keys((TagAssociation as any)[tagGroup]).length)
								.setOptions(
									Object.entries((TagAssociation as any)[tagGroup]).map((tagTuple: any) =>
										new StringSelectMenuOptionBuilder()
											.setLabel(tagTuple[0])
											.setValue(`${tagGroup}~${tagTuple[0]}`)
											.setDefault((BigInt(resolvedPost!.bitwiseTags ?? 0) & BigInt(tagTuple[1])) !== BigInt(0))
									)
								)
						)
					]
				} as any)
				return
			}
			if (interaction.customId !== "qi-quick-reject")
				return

			const val = interaction.values[0]
			let response = "Unknown Reason"
			switch (val) {
				case 'a-1': {
					response = "> Hiring advertisements must adhere to the minimum payment threshold of $2.50 and/or 200R$, and should not propose a percentage-only compensation unless accompanied by a minimum payment or as an additional option. A specific value must be stated. If a Marketplace Moderator deems your workload to be significantly too heavy for the offered pay, your post will be declined due to our [Quality Control Procedures](https://docs.google.com/document/d/1Lljpo-xQvaADE1buWXPPqfnaSJeF6X3qnDsiA-zPOKA/edit?usp=sharing)."
					break
				}
				case 'a-2': {
					response = "> You must write a detailed Client-Freelancer Agreement, similar to a Terms of Service. This includes every detail of how the functionality of the deal will work. You are welcome to use one of our [RD standard templates](https://pastebin.com/zqCpGHnh), but it must be specified within your post. You **MUST DISCLAIM** at the bottom of your post either \"RD Standard Agreement\" (or something similar) or your own agreement. RD's rules supercede an Agreement in all contexts, and predatory Agreements are as bannable as scams."
					break
				}
				case 'a-3': {
					response = "> Not meeting minimum payment criteria in your post template will result in 1d - 3d Market Bans, as this indicates that you've not read the rules. This is an offense because you're wasting the time of Market Staff due to a lack of respect for us. Intentionally attempting to evade minimum payment criteria (attempting to mislead Marketplace Staff into thinking you're meeting minimum payment criteria) will result in 3d - permanent Marketplace ban"
					break
				}
				case 'b-1': {
					response = "> For-Hire listings are exempt from minimum payment rules, but are required to estimate the payment for their labor. They may offer services in exchange for a percentage of revenue, however, revenue may not be the only form of payment you accept on your listing."
					break
				}
				case 'b-2': {
					response = "> You must have a listed portfolio within your post. Accepted links are listed in the [RD QCP](https://docs.google.com/document/d/1Lljpo-xQvaADE1buWXPPqfnaSJeF6X3qnDsiA-zPOKA/edit?usp=sharing)."
					break
				}
				case 'c-1': {
					response = "> While Selling posts are not bound by minimum payment amounts, they are obligated to declare a value and may include revenue percentage proposals if desired."
					break
				}
				case 'c-2': {
					response = "> You must provide **one or more images of the listed product** if offering;\n> - VFX\n> - Builds\n> - Models\n> - Maps\n> - UI\n> - Full games\n> This can be via a web listing (for example, portfolio-like link) or via our embed system on posts."
					break
				}
				case 'd-1': {
					response = "> You may not, under any circumstances, list a **stolen game** in our LF-Investor forum. If you display an uncopylocked / purchased game, you must **SPECIFICALLY STATE** that the game is uncopylocked, or that you've purchased it from another owner."
					break
				}
				case 'e-1': {
					response = "> If asked to leave a Member's LF Collab Post, please exit immediately. In the case of concerning behavior / listings, open a ticket for support."
					break
				}
				case 'g-1': {
					response = "~ *Please abstain from any form of theft, which commonly involves:*\n> - Appropriating another's work **without adhering to the established agreement**, often characterized by a failure to properly pay the Freelancer.\n> - Please refrain from any act of piracy with regards to creative works. **Misrepresentation of ownership**, be it within your portfolio or during informal discussions, is regarded as fraudulent activity.\n> - Accepting financial payment and subsequently neglecting to execute the delivery of work as stipulated in the agreement. \n> - **Any form of violating an agreement** between another Member will be moderated. Feel free to consult with Marketplace Staff prior to making any large decisions that may be interpreted negatively.\n> - **Please ensure that any works offered for sale are your exclusive property.** Engaging in the sale of non-exclusive or previously sold works is deemed fraudulent, and undermines the integrity of our Marketplace."
					break
				}
				case 'h-1': {
					response = "~ *Please uphold a respectful demeanor towards all Members, including within private messages and external platforms. Adherence to the code of conduct outlined in [#rules](<https://discord.com/channels/489424959270158356/753682979284451368>) is expected, along with the exercise of sound judgement. **DMs are fully moderateable in any circumstance, no exceptions.***\n\n> - This includes any form of baseless slander against our Members; whether it be within chat, external locations, such as DMs, or even other servers. Accusations must be made with **tangible proof in hand**."
					break
				}
				case 'i-1': {
					response = "~ *As much as we would like to allow you to freely make your sales and purchases, we at NIGHTHAWK SERVERS have a commitment to keep you, and any communities we may interact with, safe. Due to this reason, the following is not permissible;*\n\n> - Selling **Accounts**, **Communities** and **Servers**\n> - Displaying personal phone numbers\n> - Personal email addresses\n> - Links to private / personal social media profiles"
					break
				}
				case 'j-1': {
					response = "~ *Annoying formatting, short and nondescript posts, low quality grammar / spelling, or even a lack of professionalism are all valid reasons for a Marketplace Moderator to reject your post.*\n\n> - If your post is deemed to be low-quality, you will receive a DM from NEST saying that your post was rejected, along with a rejection reason. If you're struggling with creating an attention-grabbing post, feel free to ping or DM me (<@1216550840597483550>), and I'll assist you personally."
					break
				}
				case 'n-a': {
					// N/A RESPONSE -- Contact marketplace staff
					response = "Please contact marketplace staff (or open a ticket) with a screenshot of this message in order to have your template approved for posting."
					break
				}
			}

			const resolvedPost = await resolveTemplateFromContent(interaction.message.content)
			if (!resolvedPost) {
				attemptRegeneration(interaction)
				return
			}
			if (!validateOwnership(resolvedPost._id.toString(), interaction.user.id)) {
				attemptRegeneration(interaction)
				return
			}
			const resolvedPostId = resolvedPost!._id as unknown as string
			const postTemplateCache = localPostTemplateCache.get(resolvedPostId)
			if (postTemplateCache) {
				await PostTemplateChanges.create({
					marketModerator: interaction.user.id,
					userId: resolvedPost.userID,
					templateChannel: resolvedPost.jobType ?? "UNKNOWN",
					templateType: "REJECT",
					templateCreatedAt: resolvedPost.createdAt,
					templateChangedAt: resolvedPost.updatedAt,
					isActionUnique: false
				})
			} else {
				await PostTemplateChanges.create({
					marketModerator: interaction.user.id,
					userId: resolvedPost.userID,
					templateChannel: resolvedPost.jobType ?? "UNKNOWN",
					templateType: "REJECT",
					templateCreatedAt: resolvedPost.createdAt,
					templateChangedAt: resolvedPost.updatedAt,
					isActionUnique: true
				})
				localPostTemplateCache.set(resolvedPostId, new Date())
			}
			await resolvedPost.updateOne({
				approved: false,
				waitingForApproval: false,
				isQueueServed: false
			})
			const logChannel = interaction.guild.channels.cache.find((c: Channel) => {
				if (c.type === ChannelType.GuildText) {
					if (c.name === "template-approval-log") {
						return c
					}
				}
			})
			const rejectionEmbed = new EmbedBuilder()
				.setTitle('Template Rejected')
				.setColor("Red")
				.setFooter({
					text: `NIGHTHAWK SERVERS Marketplace · Rejected by ${interaction.user.username}`
				})
				.setTimestamp()
				.setDescription(`Your template for __${resolvedPost.jobType.toLowerCase()}__ has been rejected. Please make any necessary changes and submit again.\n**Rejection Reason**:\n>>> ${response}`)
			const userToSend = await client.users.fetch(resolvedPost.userID).catch(() => { })
			if (userToSend) {
				await userToSend.send({
					embeds: [
						rejectionEmbed
					]
				}).catch(() => { })
			}
			if (logChannel) {
				await (logChannel as TextChannel).send({
					content: `<@${resolvedPost.userID}>`,
					embeds: [
						rejectionEmbed
					]
				}).catch((err) => { })
			}
			attemptRegeneration(interaction)
			return
		}
		if (!interaction.isButton())
			return

		switch (interaction.customId) {
			// TODO: Implement actually accepting the post
			// TODO: Implement all other buttons
			case 'qi-accept': {
				Log.debug('Received post Accept interaction')
				if (!interaction.member.roles.cache.hasAny("1480435906044362814", "1480436288296583228", "1480436503187423342", "1481021796298915972")) {
					interaction.reply({ content: `${config.failedEmoji} You do not have permission to do this.`, ephemeral: true })
					return
				}

				const resolvedPost: any = await resolveTemplateFromContent(interaction.message.content)
				if (!resolvedPost) {
					attemptRegeneration(interaction)
					return
				}
				if (!validateOwnership(resolvedPost._id.toString(), interaction.user.id)) {
					attemptRegeneration(interaction)
					return
				}

				const approveUser = interaction.guild.members.cache.get(resolvedPost.userID)
				if (!approveUser) {
					await resolvedPost.updateOne({
						waitingForApproval: false,
					})
					attemptRegeneration(interaction)
					return
				}
				const postTemplateCache = localPostTemplateCache.get(resolvedPost._id!)
				if (postTemplateCache) {
					await PostTemplateChanges.create({
						marketModerator: interaction.user.id,
						userId: approveUser!.user.id,
						templateChannel: resolvedPost.jobType ?? "UNKNOWN",
						templateType: "APPROVE",
						templateCreatedAt: resolvedPost.createdAt,
						templateChangedAt: resolvedPost.updatedAt,
						isActionUnique: false
					})
				} else {
					await PostTemplateChanges.create({
						marketModerator: interaction.user.id,
						userId: approveUser!.user.id,
						templateChannel: resolvedPost.jobType ?? "UNKNOWN",
						templateType: "APPROVE",
						templateCreatedAt: resolvedPost.createdAt,
						templateChangedAt: resolvedPost.updatedAt,
						isActionUnique: true
					})
					localPostTemplateCache.set(resolvedPost._id, new Date())
				}

				await resolvedPost.updateOne({
					approved: true,
					waitingForApproval: false,
					isQueueServed: false
				})

				const logChannel = interaction.guild.channels.cache.find((c: Channel) => {
					if (c.type === ChannelType.GuildText) {
						if (c.name === "template-approval-log") {
							return c
						}
					}
				})
				Log.debug('Sending TemplateAccepted embed')
				const embed = new EmbedBuilder()
					.setTitle('Template Accepted')
					.setColor("Green")
					.setFooter({
						text: `NIGHTHAWK SERVERS Marketplace · Approved by ${interaction.user.username}`
					})
					.setTimestamp()
					.setDescription(`Your template for __${resolvedPost.jobType.toLowerCase()}__ has been approved! You may now post to the marketplace.\n\nRun \`/post\` in <#639874483301384223> to post!`)
				const userToSend = await client.users.fetch(approveUser.id).catch(() => { })
				if (userToSend) {
					await userToSend.send({
						embeds: [
							embed
						]
					}).catch(() => { })
				}
				if (logChannel) {
					await (logChannel as TextChannel).send({
						content: `<@${approveUser.id}>`,
						embeds: [
							embed
						]
					}).catch((err) => { })
				}
				attemptRegeneration(interaction)
				return
				break
			}
			case 'qi-reject': {
				if (!interaction.member.roles.cache.hasAny("1480435906044362814", "1480436288296583228", "1480436503187423342", "1481021796298915972")) {
					interaction.reply({ content: `${config.failedEmoji} You do not have permission to do this.`, ephemeral: true })
					return
				}

				const resolvedPost = await resolveTemplateFromContent(interaction.message.content)
				if (!resolvedPost) {
					attemptRegeneration(interaction)
					return
				}
				if (!validateOwnership(resolvedPost._id.toString(), interaction.user.id)) {
					attemptRegeneration(interaction)
					return
				}

				const form = new ModalBuilder()
					.setCustomId("reject_form_queue")
					.setTitle("Enter a reason for rejection")

				const formInput: TextInputBuilder[] = [
					new TextInputBuilder()
						.setCustomId('reject_reason')
						.setLabel('Reason for rejection')
						.setPlaceholder("Please enter a valid and detailed reason for rejection")
						.setMaxLength(1500)
						.setRequired(false)
						.setStyle(TextInputStyle.Paragraph)
				]

				for (const arg of formInput) {
					form.addComponents(new ActionRowBuilder<TextInputBuilder>().setComponents(arg))
				}

				await interaction.showModal(form as any)

				break
			}
			case "qi-template-release": {
				if (!interaction.member.roles.cache.hasAny("1480435906044362814", "1480436288296583228", "1480436503187423342", "1481021796298915972")) {
					interaction.reply({ content: `${config.failedEmoji} You do not have permission to do this.`, ephemeral: true })
					return
				}

				const resolvedPost: any = await resolveTemplateFromContent(interaction.message.content)
				if (!resolvedPost) {
					attemptRegeneration(interaction)
					return
				}
				if (!validateOwnership(resolvedPost._id.toString(), interaction.user.id)) {
					await (interaction as ButtonInteraction).update({
						components: [],
						embeds: [],
						content: 'This post does not belong to you.'
					})
				}

				await resolvedPost.updateOne({
					approved: false,
					waitingForApproval: true,
					isQueueServed: false,
					queueServedTo: undefined
				})

				await (interaction as ButtonInteraction).update({
					components: [],
					embeds: [],
					content: 'Post ownership returned to queue.'
				})
				return
				break
			}
			case 'tag-group-select-back': {
				await interaction.update({
					components: defaultQueueInterfaceRows as any
				})
				break
			}
		}
	}
}