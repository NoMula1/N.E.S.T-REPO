"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.knownModerationTypes = void 0;
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const GlobalScope_1 = require("../../../bootstrap/GlobalScope");
const Case_1 = __importDefault(require("../../../schemas/Case"));
const quickchart_js_1 = __importDefault(require("quickchart-js"));
exports.knownModerationTypes = [
    'Warn',
    'Mute',
    'Kick',
    'Ban',
];
const average = (array) => array.reduce((a, b) => a + b) / array.length;
function calculateRatio(num_1, num_2) {
    for (let num = num_2; num > 1; num--) {
        if ((num_1 % num) == 0 && (num_2 % num) == 0) {
            num_1 = num_1 / num;
            num_2 = num_2 / num;
        }
    }
    return `${num_1}:${num_2}`;
}
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("staff_history")
    .setDescription("View a staff members' moderation history")
    .addUserOption(opt => opt.setName("user")
    .setDescription("Select the user you would like to view moderation history on")
    .setRequired(true))
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ModerateMembers)
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.AssistantModerator,
    Scope: GlobalScope_1.Scope.Admin,
})
    .setExecutor(async (interaction) => {
    if (!interaction.inCachedGuild()) {
        await interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    await interaction.deferReply();
    const timeBeforeMs = Date.now();
    const user = interaction.options.getUser("user");
    const userModerations = await Case_1.default.find({
        guildID: interaction.guild.id,
        modID: user.id,
    }).catch(async () => {
        await interaction.editReply('Failed to fetch case data for this user!');
        return;
    });
    if (!userModerations || userModerations.length === 0) {
        await interaction.editReply({ content: `No moderation history found for <@${user.id}>.` });
        return;
    }
    const moderationDates = userModerations.map((moderation) => new Date(moderation.dateIssued));
    const oldestDate = new Date(Math.min(...moderationDates.map(d => d.getTime())));
    const startDate = new Date(Math.max(Date.now() - 30 * 24 * 60 * 60 * 1000, oldestDate.getTime()));
    const dateCounts = new Map();
    for (const moderation of userModerations) {
        const date = new Date(moderation.dateIssued).toISOString().split('T')[0];
        if (new Date(date) >= startDate) {
            dateCounts.set(date, (dateCounts.get(date) || 0) + 1);
        }
    }
    for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        if (!dateCounts.has(dateStr)) {
            dateCounts.set(dateStr, 0);
        }
    }
    const sortedDates = Array.from(dateCounts.keys()).sort();
    const sortedCounts = sortedDates.map(date => dateCounts.get(date));
    const chart = new quickchart_js_1.default();
    chart.setConfig({
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [{
                    label: 'Moderations Per Day',
                    data: sortedCounts,
                    fill: false,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    tension: 0.1,
                }],
        },
        options: {
            scales: {
                x: { title: { display: true, text: 'Date' } },
                y: { title: { display: true, text: 'Moderations' }, beginAtZero: true },
            },
        },
    });
    const activeModerations = userModerations.filter((pred) => { return pred.active === true; });
    const inactiveModerations = userModerations.filter((pred) => { return pred.active === false; });
    const allTangibleDurations = userModerations.filter((pred) => { if (pred.durationUnix === 0) {
        return false;
    } return true; });
    const averageTangiblePunishmentDuration = average(allTangibleDurations.map((val) => val.durationUnix / 3600));
    const allRoleBans = userModerations.filter((pred) => { return pred.caseType.endsWith(" BAN"); });
    const roleBansExpanded = new Map();
    for (const roleban of allRoleBans) {
        if (roleBansExpanded.get(roleban.caseType)) {
            roleBansExpanded.get(roleban.caseType).push(roleban);
        }
        else {
            roleBansExpanded.set(roleban.caseType, []);
            roleBansExpanded.get(roleban.caseType).push(roleban);
        }
    }
    const allCaseTypes = [];
    for (const actionType of exports.knownModerationTypes) {
        allCaseTypes.push(userModerations.filter((pred) => { return pred.caseType.toLowerCase() === actionType.toLowerCase(); }));
    }
    let endMessage = `<@${user.id}> \`[${user.username}]\`'s moderation stats:`
        + `\n\nAll cases: __${userModerations.length}__`
        + `\nRatio of **active** to **inactive** cases: __${calculateRatio(activeModerations.length, inactiveModerations.length)}__`
        + `\nActive cases: __${activeModerations.length}__`
        + `\nInactive cases: __${inactiveModerations.length}__`
        + `\n\nCases in each category:`;
    let i = 0;
    for (const actionType of exports.knownModerationTypes) {
        endMessage += `\n- \`[${actionType.toUpperCase()}]\`: __${allCaseTypes[i].length}__`;
        i++;
    }
    endMessage += `\n\nRole ban count: __${allRoleBans.length}__`
        + `\nRole bans expanded:`;
    for (var [key, value] of roleBansExpanded.entries()) {
        endMessage += `\n- \`[${key}]\`: __${value.length}__`;
    }
    const timeTakenMs = Date.now() - timeBeforeMs;
    await interaction.editReply({
        embeds: [
            new discord_js_1.EmbedBuilder()
                .setTitle('Staff Case Statistics')
                .setDescription(endMessage)
                .setImage(chart.getUrl())
                .setFooter({ text: `${userModerations.length} total moderations logged.` }),
        ],
    });
});
