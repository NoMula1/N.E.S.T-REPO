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
    .setName("kick")
    .setDescription("Kick a user from the server.")
    .addUserOption(opt => opt.setName("user")
    .setDescription("Select the user you would like to kick.")
    .setRequired(true))
    .addStringOption(opt => opt.setName("reason")
    .setDescription("Enter the reason for the kick.")
    .setRequired(true))
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.KickMembers)
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.AssistantModerator,
    HasRole: ["1203545488008155136"],
    /**
     * 1203545488008155136 = Scam Investigator
     */
    Scope: GlobalScope_1.Scope.Admin
})
    .setExecutor(async (interaction) => {
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    const user = interaction.options.getUser("user");
    const member = interaction.options.getMember("user");
    const reason = interaction.options.getString("reason");
    if (!user || !member || !reason)
        return;
    if (!member) {
        interaction.reply((0, GenUtils_1.errorEmbed)("This user is not in the server!"));
        return;
    }
    if (interaction.member.roles.highest.position <= member.roles.highest.position || interaction.user.id == member.id) {
        interaction.reply((0, GenUtils_1.errorEmbed)("You are unable to issue a kick to this user."));
        return;
    }
    const caseNumber = await (0, GenUtils_1.incrimentCase)(interaction.guild);
    const newCase = new Case_1.default({
        guildID: interaction.guild.id,
        userID: user.id,
        modID: interaction.user.id,
        caseNumber: caseNumber,
        caseType: "KICK",
        reason: reason,
        duration: "None",
        durationUnix: null,
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
    const kickEmbed = new discord_js_1.EmbedBuilder()
        .setDescription(`**Case:** #${caseNumber} | **Mod:** ${interaction.user.username} | **Reason:** ${reason}`)
        .setColor("Blurple");
    interaction.reply({ content: `${config_1.config.arrowEmoji} **${user.username}** has been kicked. (**${warns}** warns)`, embeds: [kickEmbed] });
    await (0, GenUtils_1.sendModLogs)({ guild: interaction.guild, mod: interaction.member, targetUser: user, action: "Kick" }, { title: "User Kicked", actionInfo: `**Reason:** ${reason}\n> **Case ID:** ${caseNumber}`, channel: interaction.channel || undefined });
    member.kick(`Mod: ${interaction.user.username}\nReason: ${reason}`).catch(async (err) => {
        (0, GenUtils_1.handleError)(err);
        await interaction.reply((0, GenUtils_1.errorEmbed)(`Something went wrong!\n\n\`${err.message}\``));
    });
});
