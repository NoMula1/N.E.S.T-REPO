import { APIActionRowComponent, APIMessageActionRowComponent, ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, Channel, ChannelType, ColorResolvable, EmbedBuilder, Events, Guild, GuildMember, GuildMemberRoleManager, Interaction, ModalBuilder, ModalSubmitInteraction, PermissionFlagsBits, PermissionsBitField, Role, TextChannel, TextInputBuilder, TextInputStyle, User } from "discord.js"
import { config } from "../../utils/config"
import PostTemplates from "../../schemas/PostTemplates"
import { handleError } from "../../utils/GenUtils"
import Settings from "../../schemas/Settings"
import FastFlag from "../../schemas/FastFlag"
import Post from "../../schemas/Post"
import { timetostring } from "../../utils/timeFuncs"
import { Log, LogLevel } from "../../utils/logging"
import PostTemplateChanges from "../../schemas/PostTemplateChanges"
import { generateMarketModPerformanceButtons, generateMarketModPerformanceEmbed, refreshUserCache } from "../../commands/slash/staff/MarketModPerformance"
import { generateMarketPerformanceButtons, generateMarketPerformanceEmbed, refreshCache } from "../../commands/slash/staff/MarketPerfOverview"
import { EventOptions } from "../../utils/RegisterEvents"

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

const localPostTemplateCache = new Map<string, Date>()

export default {
	name: Events.InteractionCreate,
	once: false,
	async execute(_: EventOptions, interaction: Interaction) {

		if (interaction.isButton()) {
			const id = interaction.customId

			switch (id) {

				// Overview
				case 'market_perf_time_inf': {
					await interaction.update({
						embeds: [
							await generateMarketPerformanceEmbed('inf')
						],
						components: (await generateMarketPerformanceButtons('inf')) as unknown as any[]
					})
					return
				}

				case 'market_perf_time_30d': {
					await interaction.update({
						embeds: [
							await generateMarketPerformanceEmbed('30d')
						],
						components: (await generateMarketPerformanceButtons('30d')) as unknown as any[]
					})
					return
				}

				case 'market_perf_time_7d': {
					await interaction.update({
						embeds: [
							await generateMarketPerformanceEmbed('7d')
						],
						components: (await generateMarketPerformanceButtons('7d')) as unknown as any[]
					})
					return
				}

				case 'market_perf_time_1d': {
					await interaction.update({
						embeds: [
							await generateMarketPerformanceEmbed('1d')
						],
						components: (await generateMarketPerformanceButtons('1d')) as unknown as any[]
					})
					return
				}

				case 'market_perf_refresh_cache': {
					refreshCache()
					await interaction.update({
						embeds: [
							new EmbedBuilder()
								.setTitle('Refreshed Cache')
								.setDescription(`Cache has been refreshed.`)
								.setColor("Green")
								.setFooter({
									text: "Run the command again to see new data"
								})
								.setTimestamp()
						],
						components: [],
						content: null
					})
					return
				}

				// Personal history
				case 'mod_perf_time_inf': {
					await interaction.update({
						embeds: [
							await generateMarketModPerformanceEmbed('inf', interaction.message.content)
						],
						components: (await generateMarketModPerformanceButtons('inf')) as unknown as any[]
					})
					return
				}

				case 'mod_perf_time_30d': {
					await interaction.update({
						embeds: [
							await generateMarketModPerformanceEmbed('30d', interaction.message.content)
						],
						components: (await generateMarketModPerformanceButtons('30d')) as unknown as any[]
					})
					return
				}

				case 'mod_perf_time_2w': {
					await interaction.update({
						embeds: [
							await generateMarketModPerformanceEmbed('2w', interaction.message.content)
						],
						components: (await generateMarketModPerformanceButtons('2w')) as unknown as any[]
					})
					return
				}

				case 'mod_perf_time_1w': {
					await interaction.update({
						embeds: [
							await generateMarketModPerformanceEmbed('1w', interaction.message.content)
						],
						components: (await generateMarketModPerformanceButtons('1w')) as unknown as any[]
					})
					return
				}

				case 'mod_perf_time_1d': {
					await interaction.update({
						embeds: [
							await generateMarketModPerformanceEmbed('1d', interaction.message.content)
						],
						components: (await generateMarketModPerformanceButtons('1d')) as unknown as any[]
					})
					return
				}

				case 'mod_perf_refresh_cache': {
					refreshUserCache(interaction.message.content)
					await interaction.update({
						embeds: [
							new EmbedBuilder()
								.setTitle('Refreshed Cache')
								.setDescription(`Cache for user <@${interaction.message.content}> has been refreshed.`)
								.setColor("Green")
								.setFooter({
									text: "Run the command again to see new data"
								})
								.setTimestamp()
						],
						components: [],
						content: null
					})
					return
				}

			}
		}

	}
}