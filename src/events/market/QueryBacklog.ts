/* eslint-disable @typescript-eslint/no-explicit-any */
import { ActionRowBuilder, EmbedBuilder, Events, Interaction, ModalBuilder, ModalSubmitInteraction, TextInputBuilder, TextInputStyle } from 'discord.js'
import { EventOptions } from '../../utils/RegisterEvents'
import { generateEmbed } from './PostButton'
import PostTemplates from '../../schemas/PostTemplates'
import { client } from '../../Core'
import { config } from '../../utils/config'

const executingUsers: { [key: string]: string } = {}

export default {
	name: Events.InteractionCreate,
	once: false,
	async execute(_: EventOptions, i: Interaction) {
		if (i.isButton()) {
			switch (i.customId) {
				case "query_post": {
					if (!i.isButton()) return
					const embed = i.message.embeds[0]

					const fields = embed.fields.map(f => f.value).join('\n')
					// get the match

					executingUsers[i.user.id] = fields

					const modal = new ModalBuilder()
						.setTitle('Respond')
						.setCustomId("response")
						.addComponents(
							new ActionRowBuilder<TextInputBuilder>().addComponents(
								new TextInputBuilder()
									.setCustomId("query_id")
									.setLabel("ID to query")
									.setRequired(true)
									.setMaxLength(3)
									.setStyle(TextInputStyle.Paragraph)
							)
						)
					await i.showModal(modal)
				}
					break

				default:
					return
			}

		} else if (i.isModalSubmit() && i.guild) {
			switch (i.customId) {
				case "response": {
					await i.deferReply({ flags: "Ephemeral" })
					const fields = executingUsers[i.user.id]
					if (!fields) return
					const modalInteraction = i as unknown as ModalSubmitInteraction

					const input = (modalInteraction.fields.getField("query_id") as any)?.value
					if (!input) return
					const id = parseInt(input)
					if (isNaN(id)) return

					const m = fields.split('\n').find(e => {
						const [eNumber] = e.split(':').map(s => s.trim())
						return parseInt(eNumber) === id
					})

					if (m) {
						const ID = m.match(/\*\*([a-f0-9]+)\*\*/)?.[1]
						if (!ID) {
							delete executingUsers[i.user.id]
							return await i.editReply(errorEmbed("Error! Could not resolve ID"))
						}
						const post = await PostTemplates.findOne({
							_id: ID
						})
						if (!post) {
							delete executingUsers[i.user.id]
							return await i.editReply(errorEmbed("Error! Could not find Post"))
						}

						const user = await client.users.fetch(post?.userID)

						const embed = generateEmbed(post as any, user, i.guild, true)
						await i.editReply({
							embeds: [(await embed).PostEmbed],
							content: (await embed).PostMessage
						})

					} else {
						await i.editReply(errorEmbed("Error! Could not resolve ID"))
					}

					delete executingUsers[i.user.id]
				}
					break

				default:
					return
			}

		}

	}
}
function errorEmbed(message: string) {
	const errorEmbed = new EmbedBuilder()
		.setColor("Red")
		.setDescription(`${config.failedEmoji} ${message}`)
	return { embeds: [errorEmbed] }
}