"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const GenUtils_1 = require("../../../utils/GenUtils");
const Case_1 = __importDefault(require("../../../schemas/Case"));
const Bans_1 = __importDefault(require("../../../schemas/Bans"));
const config_1 = require("../../../utils/config");
const GlobalScope_1 = require("../../../bootstrap/GlobalScope");
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("unban")
    .setDescription("Remove a ban from a user.")
    .addUserOption(opt => opt.setName("user")
    .setDescription("Select the user you would like to unban.")
    .setRequired(true))
    .addStringOption(opt => opt.setName("reason")
    .setDescription("Enter the reason for the unban.")
    .setRequired(true))
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.BanMembers)
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.Moderator,
    HasRole: ['1192313412340940841', '1203545488008155136'],
    /**
     * 1192313412340940841 = Marketplace Moderator
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
    const reason = interaction.options.getString("reason");
    if (!user || !reason)
        return;
    await interaction.guild.bans.remove(user.id, `Mod: ${interaction.user.username}\nReason: ${reason}`).then(async () => {
        const caseNumber = await (0, GenUtils_1.incrimentCase)(interaction.guild);
        const newCase = new Case_1.default({
            guildID: interaction.guild.id,
            userID: user.id,
            modID: interaction.user.id,
            caseNumber: caseNumber,
            caseType: "UNBAN",
            reason: reason,
            duration: "None",
            durationUnix: 0,
            active: null,
            dateIssued: Date.now()
        });
        newCase.save().catch((err) => {
            (0, GenUtils_1.handleError)(err);
        });
        const firstBan = await Case_1.default.findOneAndUpdate({
            guildID: interaction.guild.id,
            userID: user.id,
            caseType: "BAN",
            active: true,
        }, {
            active: false
        });
        await Bans_1.default.deleteMany({
            guildID: interaction.guild.id,
            userID: user.id
        });
        const unbannedEmbed = new discord_js_1.EmbedBuilder()
            .setDescription(`**Case:** #${caseNumber} | **Mod:** ${interaction.user.username} | **Reason:** ${reason}`)
            .setColor("Green");
        await interaction.reply({ embeds: [unbannedEmbed], content: `${config_1.config.arrowEmoji} **${user.username}** has been unbanned.` });
        await (0, GenUtils_1.sendModLogs)({ guild: interaction.guild, mod: interaction.member, targetUser: user, action: "Unban" }, { title: "User Unbanned", actionInfo: `**Reason:** ${reason}\n> **Case ID:** ${caseNumber}`, channel: interaction.channel || undefined });
    }).catch(async (err) => {
        (0, GenUtils_1.handleError)(err);
        await interaction.reply((0, GenUtils_1.errorEmbed)(`Something went wrong!\n\n\`${err.message}\``));
    });
});
