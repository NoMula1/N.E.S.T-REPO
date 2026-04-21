"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const GenUtils_1 = require("../../../utils/GenUtils");
const Case_1 = __importDefault(require("../../../schemas/Case"));
const config_1 = require("../../../utils/config");
const GlobalScope_1 = require("../../../bootstrap/GlobalScope");
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("unmute")
    .setDescription("Remove a mute from a user.")
    .addUserOption(opt => opt.setName("user")
    .setDescription("Select the user you would like to unban.")
    .setRequired(true))
    .addStringOption(opt => opt.setName("reason")
    .setDescription("Enter the reason for the unban.")
    .setRequired(true))
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.AssistantModerator,
    HasRole: ['1480437092361175163', '1474515140841046231', '1474515390418780330', '1474514887609680124'],
    /**
     * 1480437092361175163 = Trial Help Forums Moderator
     * 1474515140841046231 = Scam Investigator
     * 1474515390418780330 = Trial Scam Investigator
     * 1474514887609680124 = Scam Investigations Manager
     */
    Scope: GlobalScope_1.Scope.Admin
})
    .setExecutor(async (interaction) => {
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    const user = interaction.options.getMember("user");
    const reason = interaction.options.getString("reason");
    if (!user || !reason) {
        interaction.reply((0, GenUtils_1.errorEmbed)("Invalid member!"));
        return;
    }
    if (!user.communicationDisabledUntil) {
        interaction.reply((0, GenUtils_1.errorEmbed)("This user isn't muted!"));
        return;
    }
    await user.timeout(null, `Mod: ${interaction.user.username}\nReason: ${reason}`).then(async () => {
        const caseNumber = await (0, GenUtils_1.incrimentCase)(interaction.guild);
        const newCase = new Case_1.default({
            guildID: interaction.guild.id,
            userID: user.id,
            modID: interaction.user.id,
            caseNumber: caseNumber,
            caseType: "UNMUTE",
            reason: reason,
            duration: "None",
            durationUnix: 0,
            active: null,
            dateIssued: Date.now()
        });
        newCase.save().catch((err) => {
            (0, GenUtils_1.handleError)(err);
        });
        await Case_1.default.findOneAndUpdate({
            guildID: interaction.guild.id,
            userID: user.id,
            caseType: "MUTE",
            active: true,
        }, {
            active: false
        });
        const unmutedEmbed = new discord_js_1.EmbedBuilder()
            .setDescription(`**Case:** #${caseNumber} | **Mod:** ${interaction.user.username} | **Reason:** ${reason}`)
            .setColor("Green");
        await interaction.reply({ embeds: [unmutedEmbed], content: `${config_1.config.arrowEmoji} **${user.user.username}** has been unmuted.` });
        await (0, GenUtils_1.sendModLogs)({ guild: interaction.guild, mod: interaction.member, targetUser: user.user, action: "Unmute" }, { title: "User Unmuted", actionInfo: `**Reason:** ${reason}\n> **Case ID:** ${caseNumber}`, channel: interaction.channel || undefined });
    }).catch(async (err) => {
        (0, GenUtils_1.handleError)(err);
        await interaction.reply((0, GenUtils_1.errorEmbed)(`Something went wrong!\n\n\`${err.message}\``));
    });
});
