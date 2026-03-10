"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const Case_1 = __importDefault(require("../../../schemas/Case"));
const Settings_1 = __importDefault(require("../../../schemas/Settings"));
const quickchart_js_1 = __importDefault(require("quickchart-js"));
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("case_count")
    .setDescription("View case count")
    .setDefaultMemberPermissions(discord_js_1.PermissionsBitField.Flags.ModerateMembers)
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.Moderator
})
    .setExecutor(async (interaction) => {
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    await interaction.deferReply();
    const chartInstance = new quickchart_js_1.default();
    const trackedCases = await Case_1.default.countDocuments();
    const guildSettings = await Settings_1.default.findOne({
        guildID: interaction.guildId
    });
    const allCases = guildSettings === null || guildSettings === void 0 ? void 0 : guildSettings.caseCount;
    const caseTypes = {
        BAN: await Case_1.default.countDocuments({ caseType: "BAN" }),
        UNBAN: await Case_1.default.countDocuments({ caseType: "UNBAN" }),
        KICK: await Case_1.default.countDocuments({ caseType: "KICK" }),
        MUTE: await Case_1.default.countDocuments({ caseType: "MUTE" }),
        UNMUTE: await Case_1.default.countDocuments({ caseType: "UNMUTE" }),
        WARN: await Case_1.default.countDocuments({ caseType: "WARN" }),
        MODERATION_INFER: await Case_1.default.countDocuments({ caseType: "MODERATION_INFER" }),
    };
    const chartConfiguration = {
        type: 'pie',
        data: {
            labels: Object.keys(caseTypes),
            datasets: [{
                    data: Object.values(caseTypes),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(153, 102, 255, 0.6)',
                        'rgba(255, 159, 64, 0.6)',
                        'rgba(128, 128, 128, 0.6)'
                    ]
                }]
        },
        options: {
            plugins: {
                legend: {
                    labels: {
                        color: 'white', // Set legend text color to white
                    },
                },
            },
            layout: {
                backgroundColor: 'black', // Set background to black
            },
        },
    };
    chartInstance.setConfig(chartConfiguration);
    await interaction.editReply({
        embeds: [
            new discord_js_1.EmbedBuilder()
                .setTitle(`Case Count`)
                .setColor(discord_js_1.Colors.Blurple)
                .setDescription(`Historically Tracked Cases: \`${allCases}\`\nActively Tracked Cases: \`${trackedCases}\``)
                .setImage(chartInstance.getUrl())
        ]
    });
});
