import { ModalSubmitInteraction, TextInputStyle, TextInputBuilder, Interaction, APIMessageActionRowComponent, ChannelType, Message, TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, APIActionRowComponent, Events } from "discord.js"
import ModMail from "../../schemas/ModMail"
import { handleError } from "../../utils/GenUtils"
import { Log } from "../../utils/logging"
import { default as channelLookup, Channel } from '../../utils/channels'
import { EventOptions } from "../../utils/RegisterEvents"

let mCount = 0

async function editLast(channel: TextChannel, userId: string, edited: ActionRowBuilder) {
	const messages = await channel.messages.fetch({ limit: 3 })
	const lastMessage = messages.find(message => message.author.id === userId)
	if (lastMessage) {
		await lastMessage.edit({ components: [edited as unknown as APIActionRowComponent<APIMessageActionRowComponent>] })
	}
}

export default {
	async onReady() {
		ModMail.deleteMany({}).catch(Log.error)
	},
	async onMessageCreate(_: EventOptions, message: Message) {
		if (message.channel.type === ChannelType.DM && message.author.bot == false) {
			// This is unused. No point in guarding for this
			//const channel = message.client.channels.cache.get('1210690235696947260') as TextChannel;
			//if (!channel) {
			//	Log.error("Channel does not exist");
			//	return;
			//}

			await message.react('✅')
			const sureEmbed = new EmbedBuilder()
				.setTitle("Are you sure you wish to send this message")
				.setDescription("Choose between the options below")

			const confirmRow = new ActionRowBuilder()
				.setComponents(
					new ButtonBuilder()
						.setCustomId('confirm')
						.setLabel("Yes")
						.setStyle(ButtonStyle.Danger),
					new ButtonBuilder()
						.setCustomId('deny')
						.setLabel("No")
						.setStyle(ButtonStyle.Success)
				)
			const newModMailUser = new ModMail({
				userID: message.author.id,
				messageID: message.id,
				channelID: message.channel.id,
				messageContent: message.content,
				author: message.author,
				authorTag: message.author.tag,
				authorDisplay: message.author.displayAvatarURL(),
				count: mCount++,
			})
			newModMailUser.save().catch((error) => {
				Log.error("Failed to save ModMailUser: " + error)
			})
			await message.reply({ embeds: [sureEmbed], components: [confirmRow as unknown as APIActionRowComponent<APIMessageActionRowComponent>] })
		}
	},
	async onInteractionCreate(_: EventOptions, interaction: Interaction) {
		if (!interaction.isButton() && !interaction.isModalSubmit()) {
			return
		}
		if (!interaction.channel) {
			Log.error("No channel found")
			return
		}
		if (interaction.isButton()) {
			switch (interaction.customId) {
				case 'send_message': {
					const modal = new ModalBuilder()
						.setTitle('Respond')
						.setCustomId("modal_respond")
					// future proofing :) - 02 (going to make this a bit better later)
					const modalInputs = [
						new TextInputBuilder()
							.setCustomId("modal_response")
							.setLabel("Response")
							.setRequired(true)
							.setMaxLength(255)
							.setStyle(TextInputStyle.Paragraph)
					]
					for (const inputs of modalInputs)
						modal.addComponents(new ActionRowBuilder<TextInputBuilder>().setComponents(inputs))
					await interaction.showModal(modal)
					break
				}
				case 'confirm': {
					try {
						const find = await ModMail.findOne({ channelID: interaction.channelId }).catch((error) => {
							handleError(error)
							return
						})

						const userID = await ModMail.findOne({ userID: interaction.user.id })
						const messageCont = userID?.messageContent
						const author = userID?.author
						const authorTag = userID?.authorTag
						const authorDisplay = userID?.authorDisplay
						if (!userID || messageCont || author || authorTag || authorDisplay) { console.log("error recieved error is: ") } // how do I catch the error if there is an error? cant use .catch
						if (!messageCont) {
							return
						}
						if (!author) {
							return
						}
						const embed = new EmbedBuilder()
							.setTitle('ModMail')
							.setDescription(messageCont)
							.setAuthor({ name: `${authorTag}`, iconURL: `${authorDisplay}` })
							.setTimestamp()
							.setFooter({ text: `${authorTag}` })
						const row = new ActionRowBuilder()
							.addComponents(
								new ButtonBuilder()
									.setCustomId('send_message')
									.setLabel('Send Message?')
									.setStyle(ButtonStyle.Primary)
									.setEmoji('✉️'))
						const sentEmbed = new EmbedBuilder()
							.setTitle("ModMail")
							.setColor("Blurple")
							.setDescription("Your message was sent")
						const confirmed = new ActionRowBuilder()
							.setComponents(
								new ButtonBuilder()
									.setCustomId('confirm')
									.setLabel("Yes")
									.setStyle(ButtonStyle.Danger)
									.setDisabled(true),
								new ButtonBuilder()
									.setCustomId('deny')
									.setLabel("No")
									.setStyle(ButtonStyle.Success)
									.setDisabled(true)
							)

						if (!find || !find.channelID) {
							Log.error("No channel ID found for confirm action")
							return
						}

						//const channel = client.channels.cache.get('1212593742423527454') as TextChannel;
						const channel = interaction.client.channels.cache.get(channelLookup(Channel.MOD_MAIL)) as TextChannel
						editLast(interaction.client.channels.cache.get(find.channelID) as TextChannel, channelLookup(Channel.MOD_MAIL), confirmed)
						await interaction.reply({ embeds: [sentEmbed], ephemeral: true })
						await channel.send({ embeds: [embed], components: [row as unknown as APIActionRowComponent<APIMessageActionRowComponent>] }).then(sentMessage => {
							find.messageID = sentMessage.id
						}).catch((error) => {
							Log.error("Failed to send embed: " + error)

						})
					} catch (error) {
						handleError(error as Error)
					}
				} break
				case 'deny': {
					const findD = await ModMail.findOne({ channelID: interaction.channelId }).catch((error) => {
						handleError(error)
						return
					})
					if (!findD?.channelID) {
						return
					}
					const denied = new ActionRowBuilder()
						.setComponents(
							new ButtonBuilder()
								.setCustomId('confirm')
								.setLabel("Yes")
								.setStyle(ButtonStyle.Danger)
								.setDisabled(true),
							new ButtonBuilder()
								.setCustomId('deny')
								.setLabel("No")
								.setStyle(ButtonStyle.Success)
								.setDisabled(true)
						)
					editLast(interaction.client.channels.cache.get(findD.channelID) as TextChannel, '839572270753775676', denied)
					interaction.reply({ content: "Thanks for contacting anyways," })
					break
				}
				default:
					break
			}
		} else if (interaction.isModalSubmit()) {
			const modalInteraction = interaction as unknown as ModalSubmitInteraction
			if (!modalInteraction.channel) {
				Log.error("no channel found for modal")
				return
			}

			if (!interaction.message) {
				return
			}
			const foundCase = await ModMail.findOneAndDelete({ count: mCount }).catch((error: Error) => {
				handleError(error)
			})
			if (!foundCase) {
				return
			}

			if (!foundCase || !foundCase.userID) {
				return
			}
			const caseUser = await interaction.client.users.fetch(foundCase.userID)
			if (!caseUser) {
				interaction.reply({ content: "err user not found", ephemeral: true })
				return
			}
			const description = modalInteraction.fields.getTextInputValue("modal_response")
			const embedDescription = new EmbedBuilder()
				.setTitle("New Reply")
				.setColor('Yellow')
				.setAuthor({ name: `${modalInteraction.user.username}` })
				.setDescription(`${description}`)
			await caseUser.send({ embeds: [embedDescription] })
			await modalInteraction.reply({ content: "Reply submitted!", ephemeral: true })
		}
	}
}
