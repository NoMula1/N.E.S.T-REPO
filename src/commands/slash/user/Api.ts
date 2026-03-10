// Imported from personal project https://github.com/iamlanjt/rodox (which was created from NEST-JS)

import { ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { parse } from "yaml"

const GITHUB_DOCUMENTATION_URL = "https://raw.githubusercontent.com/Roblox/creator-docs/main/content/en-us"

export interface queryChunk {
	elasticsearchDocumentId: string;
	identifier: string;
	title: string;
	displayedSummary: string;
	documentationContentType: string;
	documentationSubType: string;
	documentationThirdType: string;
	resultTargetReference: string;
	reference: any[];
	tags: string[];
	labels: any[];
}

// TODO: make request less odd
async function searchQuery(queryParam: string, pageSize?: number): Promise<queryChunk[]> {
	const requestResult = await fetch("https://apis.roblox.com/creator-resources-search-api/v1/search/docsite", {
		"credentials": "include",
		"headers": {
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
			"Accept": "*/*",
			"Accept-Language": "en-us,en;q=0.5",
			"Content-Type": "application/json-patch+json",
		},
		referrer: "https://create.roblox.com/",
		body: `{"keyword": "${queryParam}","isFuzzyMatch":false,"documentationContentType":"","documentationSubType":"","documentationThirdType":"","tag":"","locale":"en-US","pageSize":${pageSize ?? 20}}`,
		method: "POST",
		mode: "cors"
	})

	return await requestResult.json()
}

async function searchUrlToGithubResolver(searchUrl: string) {
	let ghUrl = ""
	if (!searchUrl.split("#")) {
		ghUrl = `${GITHUB_DOCUMENTATION_URL}/${searchUrl.split("search@/")[1]}.yaml`
	} else {
		// Omit user utility things like search@/reference/engine/classes/BasePart#(BrickColor) <- property, used to scroll to property on a web-based version
		ghUrl = `${GITHUB_DOCUMENTATION_URL}/${(searchUrl.split("#")[0]).split("search@/")[1]}.yaml`
	}
	const fetchedResult = await (await fetch(ghUrl)).text()
	if (!fetchedResult)
		return null

	const parsedYaml = parse(fetchedResult)
	return parsedYaml
}

function findProperty(propName: string, resultObj: any) {
	const f = resultObj.properties.find((p: any) => p.name === propName)
	return f ?? null
}

export default new CommandExecutor()
	.setName("api")
	.setDescription("Search roblox's API")
	.setBasePermission({
		Level: PermissionLevel.None,
	})
	.addStringOption(op =>
		op.setName('query')
			.setDescription('The query to search for')
			.setMinLength(1)
			.setMaxLength(80)
			.setRequired(true))

	.setExecutor(async (interaction) => {
		// await interaction.reply('WIP')
		// return
		const query = interaction.options.getString('query') as string

		const queryResults: any = await searchQuery(query, 8)
		const innerChunkResults: queryChunk[] = queryResults.results

		const finalResults = ''
		const actionRow = new ActionRowBuilder()
		const selectMenu = new StringSelectMenuBuilder()
		selectMenu.setCustomId('search_select')

		for (const resultObj of innerChunkResults) {
			const title = `${resultObj.title} | typeof ${resultObj.documentationSubType}`
			const opt = new StringSelectMenuOptionBuilder()
				.setValue(`search@${resultObj.resultTargetReference}`)
				.setLabel(title)
				.setDescription('Pick one to learn more about it')
			selectMenu.addOptions(opt)
		}
		actionRow.addComponents(selectMenu)

		const message = await interaction.reply({
			components: [actionRow as any] // ew
		})

		const collectorFilter = (i: any) => i.user.id === interaction.user.id

		const confirmation = await message.awaitMessageComponent({ filter: collectorFilter, time: 60000 })
		const reply = await confirmation.update({
			content: 'Fetching...',
			components: [],
			embeds: [],
			fetchReply: true
		}).catch(() => { })
		if (confirmation.isStringSelectMenu()) {
			const selection: string = confirmation.values![0]
			const resultObj = await searchUrlToGithubResolver(selection)
			if (!resultObj) {
				await confirmation.followUp('Sorry, I failed to fetch that documentation. Please try again later!').catch(() => { })
				return
			}

			switch (resultObj.type) {
				case 'datatype':
				case 'class': {
					const props = selection.split("#")
					if (props.length > 1) {
						// console.log('Invoking props path')
						const foundProp = findProperty(`${resultObj.name}.${props[1]}`, resultObj)
						if (!foundProp) {
							await confirmation.followUp('Sorry, I failed to fetch the property of that class. Please try again later!')
							return
						}

						const docPropEmbed = new EmbedBuilder()
							.setTitle((foundProp.name ?? 'Unknown'))
							.setURL(`https://create.roblox.com/docs/${selection.split("search@/")[1]}`) // web-based redirect url should not be stripped of the web-based utility "#" locator
							.setAuthor({
								name: `Property of the ${resultObj.name} ${resultObj.type.toLowerCase()}` // e.x "Property of the Accessory class"
							})
							.setDescription(foundProp.description.substring(0, 4095))
							.setFooter({
								text: 'This content was parsed from the Roblox Creator Documentation.'
							})
							.setColor("Green")

						await confirmation.followUp({
							embeds: [
								docPropEmbed
							]
						})
						return
					}

					let propsString = "\n\n__Properties__:\n"
					propsString += `This section contains summarized descriptions. Use \`/api query: ${resultObj.name}.<NAME>\` for more detailed information.`
					for (const prop of resultObj.properties) {
						let tagsString = ""
						let idx = 0
						for (const tag of prop.tags) {
							if (idx > 0)
								tagsString += ', '

							tagsString += `\`${tag}\``
							idx++
						}
						let propSum = prop.summary
						if (prop.summary.length < 1)
							propSum = null
						propsString += `\n\n**${prop.name}** \| ${tagsString} \n> ${propSum ?? 'No summary available'}`
						if (prop.deprecation_message.length >= 1) {
							propsString += `\n\⚠️ ${prop.deprecation_message.replace('\n', '')}`
						}
					}
					if (resultObj.properties.length === 0) {
						propsString = ""
					}

					const docEmbed = new EmbedBuilder()
						.setTitle((resultObj.name ?? 'Unknown'))
						.setURL(`https://create.roblox.com/docs/${selection.split("search@/")[1]}`)
						.setAuthor({
							name: `From the ${resultObj.category ?? 'Base'} category`
						})
						.setDescription((resultObj.description.substring(0, 1999) + ((resultObj.deprecation_message.length >= 1) ? `\⚠️ ${resultObj.deprecation_message}` : '') + propsString.substring(0, 2095)).substring(0, 4095))
						.setFooter({
							text: 'This content was parsed from the Roblox Creator Documentation.'
						})
						.setColor("Green")

					await confirmation.followUp({
						embeds: [
							docEmbed
						]
					}).catch(() => { })
					break
				}
				default: {
					await confirmation.followUp(`Sorry, that type has not been set up for parsing just yet! Feel free to suggest this to an NEST developer.`).catch(() => { })
					break
				}
			}
			await reply?.delete()?.catch(() => { })
		}
	})