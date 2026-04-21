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
    .setName("mute")
    .setDescription("Issue a mute to a user.")
    .addUserOption(opt => opt
    .setName("user")
    .setDescription("Select the user you would like to mute.")
    .setRequired(true))
    .addStringOption(opt => opt
    .setName("length")
    .setDescription("Length for the mute.")
    .setRequired(true))
    .addStringOption(opt => opt
    .setName("reason")
    .setDescription("Enter the reason for the mute.")
    .setRequired(true))
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.AssistantModerator,
    HasRole: ['1480437092361175163', '1474515140841046231', '1474515390418780330', '1474514887609680124']
    /**
     * 1480437092361175163 = Trial Help Forums Moderator
     * 1474515140841046231 = Scam Investigator
     * 1474515390418780330 = Trial Scam Investigator
     * 1474514887609680124 = Scam Investigations Manager
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
    const timeOpt = interaction.options.getString("length") || "5m";
    const length = await (0, GenUtils_1.getLengthFromString)(timeOpt);
    if (!length[0]) {
        interaction.reply((0, GenUtils_1.errorEmbed)("Invalid mute length! Ex. `1h, 7d`"));
        return;
    }
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
    await member.timeout(length[0] * 1000, `Mod: ${interaction.user.username}\nReason: ${reason}`).then(async () => {
        const caseNumber = await (0, GenUtils_1.incrimentCase)(interaction.guild);
        const newCase = new Case_1.default({
            guildID: interaction.guild.id,
            userID: user.id,
            modID: interaction.user.id,
            caseNumber: caseNumber,
            caseType: "MUTE",
            reason: reason,
            duration: length[1],
            durationUnix: (Math.floor(Date.now() / 1000) + length[0]),
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
        const mutedEmbed = new discord_js_1.EmbedBuilder()
            .setDescription(`**Case:** #${caseNumber} | **Mod:** ${interaction.user.username} | **Reason:** ${reason} | **Length:** ${length[1]}`)
            .setColor("Green");
        await interaction.reply({ content: `${config_1.config.arrowEmoji} **${user.username}** has been muted. (**${warns}** warns)`, embeds: [mutedEmbed] });
        const mutedDM = new discord_js_1.EmbedBuilder()
            .setAuthor({ name: `You have been muted`, iconURL: interaction.guild.iconURL() || undefined })
            .setDescription(`${config_1.config.bulletpointEmoji} **Reason:** ${reason}
				${config_1.config.bulletpointEmoji} **Length:** ${length[1]}
				${config_1.config.bulletpointEmoji} **Case Number:** #${caseNumber}`)
            .setColor("Green")
            .setTimestamp();
        user.send({ embeds: [mutedDM] }).catch((err) => { });
        await (0, GenUtils_1.sendModLogs)({ guild: interaction.guild, mod: interaction.member, targetUser: user, action: "Mute" }, { title: "User Muted", actionInfo: `**Reason:** ${reason}\n**Length:**${length[1]}\n> **Case ID:** ${caseNumber}`, channel: interaction.channel || undefined });
    }).catch(async (err) => {
        (0, GenUtils_1.handleError)(err);
        await interaction.reply((0, GenUtils_1.errorEmbed)(`Something went wrong!\n\n\`${err.message}\``));
    });
});
