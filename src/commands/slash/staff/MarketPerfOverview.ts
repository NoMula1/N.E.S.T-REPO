import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import PostTemplateChanges from "../../../schemas/PostTemplateChanges"
import { timetostring } from "../../../utils/timeFuncs"

interface cacheData {
	cacheRefresh: Date;
	hitResult: any[];
}

let marketPerformanceCache: cacheData | undefined

export async function refreshCache() {
	marketPerformanceCache = undefined
}

async function resolveData() {
	const hitResult = await PostTemplateChanges.find()
	if (!hitResult || hitResult.length < 1) {
		return null
	}
	return hitResult
}

async function resolveCacheData() {
	if (marketPerformanceCache) {
		if (new Date().getTime() >= marketPerformanceCache.cacheRefresh.getTime()) {
			const hitResult = await resolveData()
			if (hitResult) {
				console.log('Global cache refreshed')
				marketPerformanceCache = {
					cacheRefresh: new Date(new Date().setHours(new Date().getHours() + 3)),
					hitResult
				}
				return [hitResult, false]
			} else {
				return null
			}
		}
		return [marketPerformanceCache.hitResult, true]
	} else {
		const hitResult = await resolveData()
		if (hitResult) {
			console.log('Setting new global cache')
			marketPerformanceCache = {
				cacheRefresh: new Date(new Date().setHours(new Date().getHours() + 3)),
				hitResult
			}
			return [hitResult, false]
		} else {
			return null
		}
	}
}

export async function generateMarketPerformanceButtons(hindsight: 'inf' | '30d' | '7d' | '1d') {
	const infDays = new ButtonBuilder()
		.setCustomId('market_perf_time_inf')
		.setLabel('Inf')
		.setStyle(ButtonStyle.Primary)
	const thirtyDays = new ButtonBuilder()
		.setCustomId('market_perf_time_30d')
		.setLabel('30d')
		.setStyle(ButtonStyle.Primary)
	const sevenDays = new ButtonBuilder()
		.setCustomId('market_perf_time_7d')
		.setLabel('7d')
		.setStyle(ButtonStyle.Primary)
	const oneDay = new ButtonBuilder()
		.setCustomId('market_perf_time_1d')
		.setLabel('1d')
		.setStyle(ButtonStyle.Primary)
	const refreshCache = new ButtonBuilder()
		.setCustomId('market_perf_refresh_cache')
		.setLabel('Refresh Cache')
		.setStyle(ButtonStyle.Danger)

	switch (hindsight) {
		case 'inf': {
			infDays.setDisabled(true)
			break
		}
		case '30d': {
			thirtyDays.setDisabled(true)
			break
		}
		case '7d': {
			sevenDays.setDisabled(true)
			break
		}
		case '1d': {
			oneDay.setDisabled(true)
			break
		}
	}

	const ARB = new ActionRowBuilder()
		.addComponents(
			(infDays as any),
			(thirtyDays as any),
			(sevenDays as any),
			(oneDay as any)
		)

	const ARB2 = new ActionRowBuilder()
		.addComponents(
			(refreshCache as any)
		)

	return [ARB, ARB2]
}

export async function generateMarketPerformanceEmbed(hindsight: 'inf' | '30d' | '7d' | '1d') {
	const start = new Date()
	const hitDataRaw: any = await resolveCacheData()
	if (!hitDataRaw) {
		return new EmbedBuilder()
			.setTitle("No data available")
			.setDescription(`There is no data available to filter.`)
			.setColor("Red")
	}
	const hitData = hitDataRaw[0]
	const cacheWasHit = hitDataRaw[1]
	let hindsightDateResolution = new Date()
	switch (hindsight) {
		case 'inf': {
			hindsightDateResolution = new Date(0)
			break
		}
		case '30d': {
			hindsightDateResolution = new Date(new Date().setTime(new Date().getTime() - 2592000000))
			break
		}
		case '7d': {
			hindsightDateResolution = new Date(new Date().setTime(new Date().getTime() - 604800000))
			break
		}
		case '1d': {
			hindsightDateResolution = new Date(new Date().setTime(new Date().getTime() - 86400000))
			break
		}
	}
	const timeFilteredData = (hitData as unknown as any[]).filter((pred) => {
		return (pred as any).createdAt.getTime() >= hindsightDateResolution.getTime()
	})
	if (timeFilteredData.length < 1) {
		return new EmbedBuilder()
			.setTitle("No data available within hindsight")
			.setDescription(`There is no data available to filter within <t:${hindsightDateResolution.getTime()}:R>.`)
			.setColor("Red")
	}

	let totalNumberOfAlterations = 0
	const numberOfPostAlterationTypes = new Map<string, number>()
	numberOfPostAlterationTypes.set("APPROVE", 0)
	numberOfPostAlterationTypes.set("REVERSE", 0)
	numberOfPostAlterationTypes.set("REJECT", 0)

	const numberOfUniquePostAlterationTypes = new Map<string, number>()
	numberOfUniquePostAlterationTypes.set("APPROVE", 0)
	numberOfUniquePostAlterationTypes.set("REVERSE", 0)
	numberOfUniquePostAlterationTypes.set("REJECT", 0)

	const responseTimes = []
	for (const tracking of timeFilteredData) {
		totalNumberOfAlterations++
		const actionType = (tracking as any).templateType ?? "UNKNOWN"

		// Market mods' response time should not be harmed by reversing a template at a later date. Check for uniqueness.
		if ((tracking as any).isActionUnique) {
			responseTimes.push((tracking as any).createdAt.getTime() - (tracking as any).templateChangedAt!.getTime()!)
			numberOfUniquePostAlterationTypes.set(actionType, (numberOfUniquePostAlterationTypes.get(actionType) ?? 0) + 1)
		} else {
			numberOfPostAlterationTypes.set(actionType, (numberOfPostAlterationTypes.get(actionType) ?? 0) + 1)
		}


	}

	let averageResponseTime = ""
	if (responseTimes.length > 0) {
		const avgResponseTime: number = responseTimes.reduce((a, b) => a + b) / responseTimes.length
		averageResponseTime = timetostring(avgResponseTime)
	}

	const totalApprove = numberOfPostAlterationTypes.get("APPROVE")! + numberOfUniquePostAlterationTypes.get("APPROVE")!
	const totalReverse = numberOfPostAlterationTypes.get("REVERSE")! + numberOfUniquePostAlterationTypes.get("REVERSE")!
	const totalReject = numberOfPostAlterationTypes.get("REJECT")! + numberOfUniquePostAlterationTypes.get("REJECT")!

	return new EmbedBuilder()
		.setTitle(`Overall Market Performance`)
		.setFooter({ text: `Parsed ${timeFilteredData.length} posts in ${new Date().getTime() - start.getTime()}ms · ${cacheWasHit ? "This data was pulled from the cache" : "This data was pulled from the database"}` })
		.setDescription(
			`Perfstats for all market moderators\n**Hindsight**: ${hindsight}\n\nTotal number of post template alterations: **${totalNumberOfAlterations}**\n\n`
			+ `Number of post templates...\n`
			+ `- \`[APPROVED]\`: Total **${totalApprove}** | Unique **${numberOfUniquePostAlterationTypes.get("APPROVE")}** | Non-unique **${numberOfPostAlterationTypes.get("APPROVE")}**\n`
			+ `- \`[REVERSED]\`: Total **${totalReverse}** | Unique **${numberOfUniquePostAlterationTypes.get("REVERSE")}** | Non-unique **${numberOfPostAlterationTypes.get("REVERSE")}**\n`
			+ `- \`[REJECTED]\`: Total **${totalReject}** | Unique **${numberOfUniquePostAlterationTypes.get("REJECT")}** | Non-unique **${numberOfPostAlterationTypes.get("REJECT")}**\n`
			+ "\n"
			+ `${(averageResponseTime === "") ? "I could not find enough data to get average response time." : `On average, market mods responds within **${averageResponseTime}** of a post template being submitted. `}`
		)
}

export default new CommandExecutor()
	.setName("market_performance")
	.setDescription("Check the performance of all market moderators")
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
	.setBasePermission({
		Level: PermissionLevel.Administrator
	})
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }
		await interaction.reply({ content: `Crunching the data...`, ephemeral: true })
		const postCount = await PostTemplateChanges.countDocuments()
		await interaction.editReply({
			content: `Crunching the data...\nThis process is estimated to take approx. **${Math.round(4.1 * postCount)}ms** (**${Math.round((5.21 * postCount) / 1000)}s**)`
		})
		// await interaction.deferReply({ ephemeral: true });

		await interaction.editReply({
			embeds: [
				await generateMarketPerformanceEmbed('inf')
			],
			components: await generateMarketPerformanceButtons('inf') as unknown as any[]
		})
	})