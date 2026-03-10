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
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("warn")
    .setDescription("Issue a warning to a user.")
    .addUserOption(opt => opt.setName("user")
    .setDescription("Select the user you would like to warn.")
    .setRequired(true))
    .addStringOption(opt => opt.setName("reason")
    .setDescription("Enter the reason for the warn.")
    .setRequired(true))
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.AssistantModerator,
    HasRole: ['1243687914865557546', '1203545550448885871']
    /**
     * 1243687914865557546 = Trial Help Moderator
     * 1203545550448885871 = Senior Scam Investigator
    */
})
    .setExecutor(async (interaction) => {
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    const user = interaction.options.getUser("user");
    const member = interaction.options.getMember("user");
    const reason = interaction.options.getString("reason");
    if (!user || !reason)
        return;
    if (!member) {
        interaction.reply((0, GenUtils_1.errorEmbed)("This user is not in the server!"));
        return;
    }
    if (interaction.member.roles.highest.position <= member.roles.highest.position || interaction.user.id == member.id) {
        interaction.reply((0, GenUtils_1.errorEmbed)("You are unable to issue a warning to this user."));
        return;
    }
    const expiresAt = await (0, GenUtils_1.getLengthFromString)("30d");
    const caseNumber = await (0, GenUtils_1.incrimentCase)(interaction.guild);
    const newCase = new Case_1.default({
        guildID: interaction.guild.id,
        userID: user.id,
        modID: interaction.user.id,
        caseNumber: caseNumber,
        caseType: "WARN",
        reason: reason,
        duration: expiresAt[1],
        durationUnix: (Math.floor(Date.now() / 1000) + expiresAt[0]),
        active: true,
        dateIssued: Date.now()
    });
    newCase.save().catch((err) => {
        (0, GenUtils_1.handleError)(err);
    });
    const warns = await Case_1.default.countDocuments({
        guildID: interaction.guild.id,
        userID: user.id,
        caseType: "WARN",
        active: true,
    });
    const warnEmbed = new discord_js_1.EmbedBuilder()
        .setDescription(`**Case:** #${caseNumber} | **Mod:** ${interaction.user.username} | **Reason:** ${reason}`)
        .setColor("Green");
    interaction.reply({ content: `${config_1.config.arrowEmoji} **${user.username}** has been warned. (**${warns}** warns)`, embeds: [warnEmbed] });
    const warnedDM = new discord_js_1.EmbedBuilder()
        .setAuthor({ name: `You have been warned`, iconURL: interaction.guild.iconURL() || undefined })
        .setDescription(`${config_1.config.bulletpointEmoji} **Reason:** ${reason}
			${config_1.config.bulletpointEmoji} **Case Number:** #${caseNumber}
			
			Continued warns will result in more severe punishment. Keep in mind, warnings will expire in 30 days, meaning it will not longer effect moderation decisions, applications, and more.`)
        .setColor("Green")
        .setTimestamp();
    await user.send({ embeds: [warnedDM] }).catch((err) => { });
    await (0, GenUtils_1.sendModLogs)({ guild: interaction.guild, mod: interaction.member, targetUser: user, action: "Warning" }, { title: "User Warned", actionInfo: `**Reason:** ${reason}\n> **Case ID:** ${caseNumber}`, channel: interaction.channel || undefined });
});
