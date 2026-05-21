"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const MarketModPerformance_1 = require("../../commands/slash/staff/MarketModPerformance");
const MarketPerfOverview_1 = require("../../commands/slash/staff/MarketPerfOverview");
const ILLEGAL_CHAR_BLACKLIST = [
    "꧅",
    "𒐫",
    "𒈙",
    "⸻",
    "﷽",
    "௵",
    "௸",
    "‱"
];
const localPostTemplateCache = new Map();
exports.default = {
    name: discord_js_1.Events.InteractionCreate,
    once: false,
    async execute(_, interaction) {
        if (interaction.isButton()) {
            const id = interaction.customId;
            switch (id) {
                // Overview
                case 'market_perf_time_inf': {
                    await interaction.update({
                        embeds: [
                            await (0, MarketPerfOverview_1.generateMarketPerformanceEmbed)('inf')
                        ],
                        components: (await (0, MarketPerfOverview_1.generateMarketPerformanceButtons)('inf'))
                    });
                    return;
                }
                case 'market_perf_time_30d': {
                    await interaction.update({
                        embeds: [
                            await (0, MarketPerfOverview_1.generateMarketPerformanceEmbed)('30d')
                        ],
                        components: (await (0, MarketPerfOverview_1.generateMarketPerformanceButtons)('30d'))
                    });
                    return;
                }
                case 'market_perf_time_7d': {
                    await interaction.update({
                        embeds: [
                            await (0, MarketPerfOverview_1.generateMarketPerformanceEmbed)('7d')
                        ],
                        components: (await (0, MarketPerfOverview_1.generateMarketPerformanceButtons)('7d'))
                    });
                    return;
                }
                case 'market_perf_time_1d': {
                    await interaction.update({
                        embeds: [
                            await (0, MarketPerfOverview_1.generateMarketPerformanceEmbed)('1d')
                        ],
                        components: (await (0, MarketPerfOverview_1.generateMarketPerformanceButtons)('1d'))
                    });
                    return;
                }
                case 'market_perf_refresh_cache': {
                    (0, MarketPerfOverview_1.refreshCache)();
                    await interaction.update({
                        embeds: [
                            new discord_js_1.EmbedBuilder()
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
                    });
                    return;
                }
                // Personal history
                case 'mod_perf_time_inf': {
                    await interaction.update({
                        embeds: [
                            await (0, MarketModPerformance_1.generateMarketModPerformanceEmbed)('inf', interaction.message.content)
                        ],
                        components: (await (0, MarketModPerformance_1.generateMarketModPerformanceButtons)('inf'))
                    });
                    return;
                }
                case 'mod_perf_time_30d': {
                    await interaction.update({
                        embeds: [
                            await (0, MarketModPerformance_1.generateMarketModPerformanceEmbed)('30d', interaction.message.content)
                        ],
                        components: (await (0, MarketModPerformance_1.generateMarketModPerformanceButtons)('30d'))
                    });
                    return;
                }
                case 'mod_perf_time_2w': {
                    await interaction.update({
                        embeds: [
                            await (0, MarketModPerformance_1.generateMarketModPerformanceEmbed)('2w', interaction.message.content)
                        ],
                        components: (await (0, MarketModPerformance_1.generateMarketModPerformanceButtons)('2w'))
                    });
                    return;
                }
                case 'mod_perf_time_1w': {
                    await interaction.update({
                        embeds: [
                            await (0, MarketModPerformance_1.generateMarketModPerformanceEmbed)('1w', interaction.message.content)
                        ],
                        components: (await (0, MarketModPerformance_1.generateMarketModPerformanceButtons)('1w'))
                    });
                    return;
                }
                case 'mod_perf_time_1d': {
                    await interaction.update({
                        embeds: [
                            await (0, MarketModPerformance_1.generateMarketModPerformanceEmbed)('1d', interaction.message.content)
                        ],
                        components: (await (0, MarketModPerformance_1.generateMarketModPerformanceButtons)('1d'))
                    });
                    return;
                }
                case 'mod_perf_refresh_cache': {
                    (0, MarketModPerformance_1.refreshUserCache)(interaction.message.content);
                    await interaction.update({
                        embeds: [
                            new discord_js_1.EmbedBuilder()
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
                    });
                    return;
                }
            }
        }
    }
};
