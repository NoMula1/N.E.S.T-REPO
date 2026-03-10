import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import PostTemplateChanges from "../../../schemas/PostTemplateChanges"
import { timetostring } from "../../../utils/timeFuncs"

interface cacheData {
	cacheRefresh: Date;
	hitResult: any[];
}

const marketModPerformanceCache = new Map<string, cacheData>()

export async function refreshUserCache(user: string) {
	marketModPerformanceCache.delete(user)
}

async function resolveData(user: string) {
	const hitResult = await PostTemplateChanges.find({
		marketModerator: user
	})
	if (!hitResult || hitResult.length < 1) {
		return null
	}
	return hitResult
}

async function resolveCacheData(user: string) {
	const cacheResult = marketModPerformanceCache.get(user)
	if (cacheResult) {
		if (new Date().getTime() >= cacheResult.cacheRefresh.getTime()) {
			const hitResult = await resolveData(user)
			if (hitResult) {
				console.log('Cache refreshed')
				marketModPerformanceCache.set(user, {
					cacheRefresh: new Date(new Date().setHours(new Date().getHours() + 3)),
					hitResult
				})
				return [hitResult, false]
			} else {
				return null
			}
		}
		return [cacheResult.hitResult, true]
	} else {
		const hitResult = await resolveData(user)
		if (hitResult) {
			console.log('Setting new cache')
			marketModPerformanceCache.set(user, {
				cacheRefresh: new Date(new Date().setHours(new Date().getHours() + 3)),
				hitResult
			})
			return [hitResult, false]
		} else {
			return null
		}
	}
}

export async function generateMarketModPerformanceButtons(hindsight: 'inf' | '30d' | '2w' | '1w' | '1d') {
	const infDays = new ButtonBuilder()
		.setCustomId('mod_perf_time_inf')
		.setLabel('Inf')
		.setStyle(ButtonStyle.Primary)
	const thirtyDays = new ButtonBuilder()
		.setCustomId('mod_perf_time_30d')
		.setLabel('30d')
		.setStyle(ButtonStyle.Primary)
	const twoWeeks = new ButtonBuilder()
		.setCustomId('mod_perf_time_2w')
		.setLabel('2w')
		.setStyle(ButtonStyle.Primary)
	const oneWeek = new ButtonBuilder()
		.setCustomId('mod_perf_time_1w')
		.setLabel('1w')
		.setStyle(ButtonStyle.Primary)
	const oneDay = new ButtonBuilder()
		.setCustomId('mod_perf_time_1d')
		.setLabel('1d')
		.setStyle(ButtonStyle.Primary)
	const refreshCache = new ButtonBuilder()
		.setCustomId('mod_perf_refresh_cache')
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
		case '2w': {
			twoWeeks.setDisabled(true)
			break
		}
		case '1w': {
			oneWeek.setDisabled(true)
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
			(twoWeeks as any),
			(oneWeek as any),
			(oneDay as any)
		)

	const ARB2 = new ActionRowBuilder()
		.addComponents(
			(refreshCache as any)
		)

	return [ARB, ARB2]
}

export async function generateMarketModPerformanceEmbed(hindsight: 'inf' | '30d' | '2w' | '1w' | '1d', user: string) {
	const start = new Date()
	const hitDataRaw: any = await resolveCacheData(user)
	if (!hitDataRaw) {
		return new EmbedBuilder()
			.setTitle("No data available")
			.setDescription(`<@${user}> has no data available to filter.`)
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
		case '2w': {
			hindsightDateResolution = new Date(new Date().setTime(new Date().getTime() - 1209600000))
			break
		}
		case '1w': {
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
			.setDescription(`<@${user}> has no data available to filter within <t:${hindsightDateResolution.getTime()}:R>.`)
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
		.setTitle(`Market Mod Performance`)
		.setFooter({ text: `Parsed ${timeFilteredData.length} posts in ${new Date().getTime() - start.getTime()}ms · ${cacheWasHit ? "This data was pulled from the cache" : "This data was pulled from the database"}` })
		.setDescription(
			`Perfstats for <@${user}>\n**Hindsight**: ${hindsight}\n\nTotal number of post template alterations: **${totalNumberOfAlterations}**\n\n`
			+ `Number of post templates...\n`
			+ `- \`[APPROVED]\`: Total **${totalApprove}** | Unique **${numberOfUniquePostAlterationTypes.get("APPROVE")}** | Non-unique **${numberOfPostAlterationTypes.get("APPROVE")}**\n`
			+ `- \`[REVERSED]\`: Total **${totalReverse}** | Unique **${numberOfUniquePostAlterationTypes.get("REVERSE")}** | Non-unique **${numberOfPostAlterationTypes.get("REVERSE")}**\n`
			+ `- \`[REJECTED]\`: Total **${totalReject}** | Unique **${numberOfUniquePostAlterationTypes.get("REJECT")}** | Non-unique **${numberOfPostAlterationTypes.get("REJECT")}**\n`
			+ "\n"
			+ `${(averageResponseTime === "") ? "I could not find enough data to get average response time." : `On average, <@${user}> responds within **${averageResponseTime}** of a post template being submitted. `}`
		)
}

export default new CommandExecutor()
	.setName("market_mod_performance")
	.setDescription("Check the performance of a market moderator")
	.addUserOption(opt =>
		opt.setName("user")
			.setDescription("Select the user you would like to query.")
			.setRequired(true)
	)
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
	.setBasePermission({
		Level: PermissionLevel.Administrator,
		HasRole: ["1203545090132283402"]
	})
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }
		await interaction.deferReply({ ephemeral: true })

		const user = interaction.options.getUser("user")!
		if (!user) return

		await interaction.editReply({
			content: user.id,
			embeds: [
				await generateMarketModPerformanceEmbed('inf', user.id)
			],
			components: await generateMarketModPerformanceButtons('inf') as unknown as any[]
		})
	})