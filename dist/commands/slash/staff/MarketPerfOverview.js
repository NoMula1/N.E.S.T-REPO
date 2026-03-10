"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshCache = refreshCache;
exports.generateMarketPerformanceButtons = generateMarketPerformanceButtons;
exports.generateMarketPerformanceEmbed = generateMarketPerformanceEmbed;
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const PostTemplateChanges_1 = __importDefault(require("../../../schemas/PostTemplateChanges"));
const timeFuncs_1 = require("../../../utils/timeFuncs");
let marketPerformanceCache;
async function refreshCache() {
    marketPerformanceCache = undefined;
}
async function resolveData() {
    const hitResult = await PostTemplateChanges_1.default.find();
    if (!hitResult || hitResult.length < 1) {
        return null;
    }
    return hitResult;
}
async function resolveCacheData() {
    if (marketPerformanceCache) {
        if (new Date().getTime() >= marketPerformanceCache.cacheRefresh.getTime()) {
            const hitResult = await resolveData();
            if (hitResult) {
                console.log('Global cache refreshed');
                marketPerformanceCache = {
                    cacheRefresh: new Date(new Date().setHours(new Date().getHours() + 3)),
                    hitResult
                };
                return [hitResult, false];
            }
            else {
                return null;
            }
        }
        return [marketPerformanceCache.hitResult, true];
    }
    else {
        const hitResult = await resolveData();
        if (hitResult) {
            console.log('Setting new global cache');
            marketPerformanceCache = {
                cacheRefresh: new Date(new Date().setHours(new Date().getHours() + 3)),
                hitResult
            };
            return [hitResult, false];
        }
        else {
            return null;
        }
    }
}
async function generateMarketPerformanceButtons(hindsight) {
    const infDays = new discord_js_1.ButtonBuilder()
        .setCustomId('market_perf_time_inf')
        .setLabel('Inf')
        .setStyle(discord_js_1.ButtonStyle.Primary);
    const thirtyDays = new discord_js_1.ButtonBuilder()
        .setCustomId('market_perf_time_30d')
        .setLabel('30d')
        .setStyle(discord_js_1.ButtonStyle.Primary);
    const sevenDays = new discord_js_1.ButtonBuilder()
        .setCustomId('market_perf_time_7d')
        .setLabel('7d')
        .setStyle(discord_js_1.ButtonStyle.Primary);
    const oneDay = new discord_js_1.ButtonBuilder()
        .setCustomId('market_perf_time_1d')
        .setLabel('1d')
        .setStyle(discord_js_1.ButtonStyle.Primary);
    const refreshCache = new discord_js_1.ButtonBuilder()
        .setCustomId('market_perf_refresh_cache')
        .setLabel('Refresh Cache')
        .setStyle(discord_js_1.ButtonStyle.Danger);
    switch (hindsight) {
        case 'inf': {
            infDays.setDisabled(true);
            break;
        }
        case '30d': {
            thirtyDays.setDisabled(true);
            break;
        }
        case '7d': {
            sevenDays.setDisabled(true);
            break;
        }
        case '1d': {
            oneDay.setDisabled(true);
            break;
        }
    }
    const ARB = new discord_js_1.ActionRowBuilder()
        .addComponents(infDays, thirtyDays, sevenDays, oneDay);
    const ARB2 = new discord_js_1.ActionRowBuilder()
        .addComponents(refreshCache);
    return [ARB, ARB2];
}
async function generateMarketPerformanceEmbed(hindsight) {
    var _a, _b, _c;
    const start = new Date();
    const hitDataRaw = await resolveCacheData();
    if (!hitDataRaw) {
        return new discord_js_1.EmbedBuilder()
            .setTitle("No data available")
            .setDescription(`There is no data available to filter.`)
            .setColor("Red");
    }
    const hitData = hitDataRaw[0];
    const cacheWasHit = hitDataRaw[1];
    let hindsightDateResolution = new Date();
    switch (hindsight) {
        case 'inf': {
            hindsightDateResolution = new Date(0);
            break;
        }
        case '30d': {
            hindsightDateResolution = new Date(new Date().setTime(new Date().getTime() - 2592000000));
            break;
        }
        case '7d': {
            hindsightDateResolution = new Date(new Date().setTime(new Date().getTime() - 604800000));
            break;
        }
        case '1d': {
            hindsightDateResolution = new Date(new Date().setTime(new Date().getTime() - 86400000));
            break;
        }
    }
    const timeFilteredData = hitData.filter((pred) => {
        return pred.createdAt.getTime() >= hindsightDateResolution.getTime();
    });
    if (timeFilteredData.length < 1) {
        return new discord_js_1.EmbedBuilder()
            .setTitle("No data available within hindsight")
            .setDescription(`There is no data available to filter within <t:${hindsightDateResolution.getTime()}:R>.`)
            .setColor("Red");
    }
    let totalNumberOfAlterations = 0;
    const numberOfPostAlterationTypes = new Map();
    numberOfPostAlterationTypes.set("APPROVE", 0);
    numberOfPostAlterationTypes.set("REVERSE", 0);
    numberOfPostAlterationTypes.set("REJECT", 0);
    const numberOfUniquePostAlterationTypes = new Map();
    numberOfUniquePostAlterationTypes.set("APPROVE", 0);
    numberOfUniquePostAlterationTypes.set("REVERSE", 0);
    numberOfUniquePostAlterationTypes.set("REJECT", 0);
    const responseTimes = [];
    for (const tracking of timeFilteredData) {
        totalNumberOfAlterations++;
        const actionType = (_a = tracking.templateType) !== null && _a !== void 0 ? _a : "UNKNOWN";
        // Market mods' response time should not be harmed by reversing a template at a later date. Check for uniqueness.
        if (tracking.isActionUnique) {
            responseTimes.push(tracking.createdAt.getTime() - tracking.templateChangedAt.getTime());
            numberOfUniquePostAlterationTypes.set(actionType, ((_b = numberOfUniquePostAlterationTypes.get(actionType)) !== null && _b !== void 0 ? _b : 0) + 1);
        }
        else {
            numberOfPostAlterationTypes.set(actionType, ((_c = numberOfPostAlterationTypes.get(actionType)) !== null && _c !== void 0 ? _c : 0) + 1);
        }
    }
    let averageResponseTime = "";
    if (responseTimes.length > 0) {
        const avgResponseTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
        averageResponseTime = (0, timeFuncs_1.timetostring)(avgResponseTime);
    }
    const totalApprove = numberOfPostAlterationTypes.get("APPROVE") + numberOfUniquePostAlterationTypes.get("APPROVE");
    const totalReverse = numberOfPostAlterationTypes.get("REVERSE") + numberOfUniquePostAlterationTypes.get("REVERSE");
    const totalReject = numberOfPostAlterationTypes.get("REJECT") + numberOfUniquePostAlterationTypes.get("REJECT");
    return new discord_js_1.EmbedBuilder()
        .setTitle(`Overall Market Performance`)
        .setFooter({ text: `Parsed ${timeFilteredData.length} posts in ${new Date().getTime() - start.getTime()}ms · ${cacheWasHit ? "This data was pulled from the cache" : "This data was pulled from the database"}` })
        .setDescription(`Perfstats for all market moderators\n**Hindsight**: ${hindsight}\n\nTotal number of post template alterations: **${totalNumberOfAlterations}**\n\n`
        + `Number of post templates...\n`
        + `- \`[APPROVED]\`: Total **${totalApprove}** | Unique **${numberOfUniquePostAlterationTypes.get("APPROVE")}** | Non-unique **${numberOfPostAlterationTypes.get("APPROVE")}**\n`
        + `- \`[REVERSED]\`: Total **${totalReverse}** | Unique **${numberOfUniquePostAlterationTypes.get("REVERSE")}** | Non-unique **${numberOfPostAlterationTypes.get("REVERSE")}**\n`
        + `- \`[REJECTED]\`: Total **${totalReject}** | Unique **${numberOfUniquePostAlterationTypes.get("REJECT")}** | Non-unique **${numberOfPostAlterationTypes.get("REJECT")}**\n`
        + "\n"
        + `${(averageResponseTime === "") ? "I could not find enough data to get average response time." : `On average, market mods responds within **${averageResponseTime}** of a post template being submitted. `}`);
}
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("market_performance")
    .setDescription("Check the performance of all market moderators")
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageMessages)
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.Administrator
})
    .setExecutor(async (interaction) => {
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    await interaction.reply({ content: `Crunching the data...`, ephemeral: true });
    const postCount = await PostTemplateChanges_1.default.countDocuments();
    await interaction.editReply({
        content: `Crunching the data...\nThis process is estimated to take approx. **${Math.round(4.1 * postCount)}ms** (**${Math.round((5.21 * postCount) / 1000)}s**)`
    });
    // await interaction.deferReply({ ephemeral: true });
    await interaction.editReply({
        embeds: [
            await generateMarketPerformanceEmbed('inf')
        ],
        components: await generateMarketPerformanceButtons('inf')
    });
});
