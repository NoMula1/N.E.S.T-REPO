"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const GenUtils_1 = require("../../../utils/GenUtils");
const Case_1 = __importDefault(require("../../../schemas/Case"));
const RoleBans_1 = __importDefault(require("../../../schemas/RoleBans"));
const config_1 = require("../../../utils/config");
const GlobalScope_1 = require("../../../bootstrap/GlobalScope");
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("unroleban")
    .setDescription("Unban a user from using server features.")
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.Moderator,
    HasRole: ['1203545488008155136', '1203545309012303922'],
    /**
     * 1203545488008155136 = Scam Investigator
     * 1203545309012303922 = Help Forums Moderator
     */
    Scope: GlobalScope_1.Scope.Admin
})
    .addUserOption(opt => opt
    .setName("user")
    .setDescription("Enter a user you'd like to unban.")
    .setRequired(true))
    .addStringOption(opt => opt
    .setName("role")
    .setDescription("Enter the role you'd like to remove.")
    .setRequired(true)
    .addChoices({ name: "Media Banned", value: "media_ban" }, { name: "Help Banned", value: "help_ban" }, { name: "Voice Chat Banned", value: "vc_ban" }, { name: "Reactions Banned", value: "reaction_ban" }, { name: "VC Extras Banned", value: "vce_ban" }, { name: "Cool Channels Banned", value: "cool_ban" }, { name: "Market Banned", value: "market_ban" }, { name: "Emoji/Sticker Banned", value: "emoji_ban" }, { name: "Ticket Banned", value: "ticket_ban" }, { name: "Probation", value: "probation" }))
    .addStringOption(opt => opt
    .setName("reason")
    .setDescription("Enter the reason for the unban.")
    .setRequired(true))
    .setExecutor(async (interaction) => {
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    const member = interaction.options.getMember("user");
    if (!member) {
        interaction.reply((0, GenUtils_1.errorEmbed)("You must input a valid user."));
        return;
    }
    const selectedRole = interaction.options.getString("role") || "media_ban";
    const reason = interaction.options.getString("reason") || "No reason provided.";
    let roleID;
    let punishType;
    switch (selectedRole) {
        case "media_ban":
            const mediaBan = interaction.guild.roles.cache.find((r) => r.name.toLowerCase() === "media banned");
            if (!mediaBan) {
                interaction.reply((0, GenUtils_1.errorEmbed)("Unable to fetch `Media Banned` role! Please contact a bot developer."));
                return;
            }
            roleID = mediaBan.id;
            punishType = "MEDIA UNBAN";
            break;
        case "help_ban":
            const helpBan = interaction.guild.roles.cache.find((r) => r.name.toLowerCase() === "help banned");
            if (!helpBan) {
                interaction.reply((0, GenUtils_1.errorEmbed)("Unable to fetch `Help Banned` role! Please contact a bot developer."));
                return;
            }
            roleID = helpBan.id;
            punishType = "HELP UNBAN";
            break;
        case "vc_ban":
            const vcBan = interaction.guild.roles.cache.find((r) => r.name.toLowerCase() === "voice chat banned");
            if (!vcBan) {
                interaction.reply((0, GenUtils_1.errorEmbed)("Unable to fetch `Voice Chat Banned` role! Please contact a bot developer."));
                return;
            }
            roleID = vcBan.id;
            punishType = "VOICE CHAT UNBAN";
            break;
        case "reaction_ban":
            const reactionBan = interaction.guild.roles.cache.find((r) => r.name.toLowerCase() === "reactions banned");
            if (!reactionBan) {
                interaction.reply((0, GenUtils_1.errorEmbed)("Unable to fetch `Reactions Banned` role! Please contact a bot developer."));
                return;
            }
            roleID = reactionBan.id;
            punishType = "REACTIONS UNBAN";
            break;
        case "vce_ban":
            const vceBan = interaction.guild.roles.cache.find((r) => r.name.toLowerCase() === "vc extras banned");
            if (!vceBan) {
                interaction.reply((0, GenUtils_1.errorEmbed)("Unable to fetch `VC Extras Banned` role! Please contact a bot developer."));
                return;
            }
            roleID = vceBan.id;
            punishType = "VC EXTRAS UNBAN";
            break;
        case "cool_ban":
            const coolBan = interaction.guild.roles.cache.find((r) => r.name.toLowerCase() === "cool channels banned");
            if (!coolBan) {
                interaction.reply((0, GenUtils_1.errorEmbed)("Unable to fetch `Cool Channels Banned` role! Please contact a bot developer."));
                return;
            }
            roleID = coolBan.id;
            punishType = "COOL CHANNELS UNBAN";
            break;
        case "market_ban":
            const marketBan = interaction.guild.roles.cache.find((r) => r.name.toLowerCase() === "market banned");
            if (!marketBan) {
                interaction.reply((0, GenUtils_1.errorEmbed)("Unable to fetch `Market Banned` role! Please contact a bot developer."));
                return;
            }
            roleID = marketBan.id;
            punishType = "MARKET UNBAN";
            break;
        case "emoji_ban":
            const emojiBan = interaction.guild.roles.cache.find((r) => r.name.toLowerCase() === "emoji/sticker banned");
            if (!emojiBan) {
                interaction.reply((0, GenUtils_1.errorEmbed)("Unable to fetch `Emoji/Sticket Banned` role! Please contact a bot developer."));
                return;
            }
            roleID = emojiBan.id;
            punishType = "EMOJI/STICKER UNBAN";
            break;
        case "ticket_ban":
            const ticketBan = interaction.guild.roles.cache.find((r) => r.name.toLowerCase() === "ticket banned");
            if (!ticketBan) {
                interaction.reply((0, GenUtils_1.errorEmbed)("Unable to fetch `Ticket Banned` role! Please contact a bot developer."));
                return;
            }
            roleID = ticketBan.id;
            punishType = "TICKET UNBAN";
            break;
        case "probation":
            const probation = interaction.guild.roles.cache.find((r) => r.name.toLowerCase() === "probation");
            if (!probation) {
                interaction.reply((0, GenUtils_1.errorEmbed)("Unable to fetch `Probation` role! Please contact a bot developer."));
                return;
            }
            roleID = probation.id;
            punishType = "PROBATION UNBAN";
            break;
        default:
            roleID = "NONE";
            punishType = "NONE";
            break;
    }
    if (roleID === "NONE" || punishType === "NONE") {
        interaction.reply((0, GenUtils_1.errorEmbed)("Unable to find what you were looking for, please contact a bot dev if this issue persists."));
        return;
    }
    const findBan = await RoleBans_1.default.findOne({
        guildID: interaction.guild.id,
        userID: member.user.id,
        roleID: roleID
    });
    if (!findBan) {
        interaction.reply((0, GenUtils_1.errorEmbed)("This user does not have an active role ban under this role."));
        return;
    }
    await member.roles.remove(roleID).catch(async (err) => {
        interaction.reply((0, GenUtils_1.errorEmbed)(`I am unable to remove a role to this user!\n\n\`${err.message}\``));
        return;
    }).then(async () => {
        const caseNum = await (0, GenUtils_1.incrimentCase)(interaction.guild);
        const newCase = new Case_1.default({
            guildID: interaction.guild.id,
            userID: member.user.id,
            modID: interaction.user.id,
            caseNumber: caseNum,
            caseType: punishType,
            reason: reason,
            duration: "None",
            durationUnix: 0,
            active: true,
            dateIssued: Date.now()
        });
        newCase.save().catch((err) => { (0, GenUtils_1.handleError)(err); });
        await Case_1.default.findOneAndUpdate({
            guildID: interaction.guild.id,
            userID: member.user.id,
            caseNumber: findBan.caseNumber
        }, {
            active: false
        });
        await findBan.deleteOne();
        const warns = await Case_1.default.countDocuments({
            guildID: interaction.guild.id,
            userID: member.user.id,
            caseType: "WARN",
            active: true,
        });
        const banEmbed = new discord_js_1.EmbedBuilder()
            .setDescription(`**Case:** #${caseNum} | **Mod:** ${interaction.user.username} | **Reason:** ${reason} | **Type:** ${punishType}`)
            .setColor("Green");
        interaction.reply({ content: `${config_1.config.arrowEmoji} **${member.user.username}** has been role unbanned. (**${warns}** warns)`, embeds: [banEmbed] });
        const youAreBanned = new discord_js_1.EmbedBuilder()
            .setAuthor({ name: `You have been issued a ${punishType.toLowerCase()}`, iconURL: interaction.guild.iconURL() || undefined })
            .setDescription(`${config_1.config.bulletpointEmoji} **Reason:** ${reason}
			${config_1.config.bulletpointEmoji} **Case Number:** #${caseNum}`)
            .setColor("Green")
            .setTimestamp();
        await member.send({ embeds: [youAreBanned] }).catch((err) => { console.log("Uh oh!\n" + err.stack); });
        await (0, GenUtils_1.sendModLogs)({ guild: interaction.guild, mod: interaction.member, targetUser: member.user, action: punishType }, { title: "User Role Unbanned", actionInfo: `**Reason:** ${reason}\n> **Case ID:** ${caseNum}`, channel: interaction.channel || undefined });
    });
});
