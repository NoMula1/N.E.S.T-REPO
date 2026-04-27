"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const GenUtils_1 = require("../../../utils/GenUtils");
const Bans_1 = __importDefault(require("../../../schemas/Bans"));
const Case_1 = __importDefault(require("../../../schemas/Case"));
const config_1 = require("../../../utils/config");
const GlobalScope_1 = require("../../../bootstrap/GlobalScope");
const Settings_1 = __importDefault(require("../../../schemas/Settings"));
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("ban")
    .setDescription("Ban a user from the server.")
    .addUserOption(opt => opt.setName("user")
    .setDescription("Select the user you would like to ban.")
    .setRequired(true))
    .addStringOption(opt => opt.setName("reason")
    .setDescription("Enter the reason for the ban.")
    .setRequired(true))
    .addBooleanOption(opt => opt.setName("is_hard")
    .setDescription("delete messages from the past day")
    .setRequired(false))
    .addStringOption(opt => opt.setName("length")
    .setDescription("Enter the length for the ban. (Ex. 1h, 7d)")
    .setRequired(false))
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.BanMembers)
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.Moderator,
    HasRole: ['1392220113909846018', '1406065795464822917', '1413957083598164008', '1474515140841046231', '1474515390418780330', '1474514887609680124'],
    /**
     * 1392220113909846018 = Trial Moderator
     * 1406065795464822917 = Moderator
     * 1413957083598164008 = Senior Moderator
     * 1474515140841046231 = Scam Investigator
     * 1474515390418780330 = Trial Scam Investigator
     * 1474514887609680124 = Scam Investigations Manager
    */
    Scope: GlobalScope_1.Scope.Admin
})
    .setExecutor(async (interaction) => {
    var _a, _b, _c;
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    const user = interaction.options.getUser("user");
    const member = interaction.options.getMember("user");
    const reason = interaction.options.getString("reason");
    const hard = interaction.options.getBoolean("is_hard") || false;
    if (!user || !reason)
        return;
    const length = await (0, GenUtils_1.getLengthFromString)(interaction.options.getString("length") || "");
    let lengthNum = (Math.floor(Date.now() / 1000) + (length[0] || 0));
    if (!interaction.options.getString("length")) {
        length[1] = "Permanent";
        lengthNum = Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60); // Set lengthNum to 10 years for "Permanent"
    }
    if (member) {
        if (interaction.guild.ownerId == member.id || ((_b = (_a = interaction.guild.members.me) === null || _a === void 0 ? void 0 : _a.roles.highest.position) !== null && _b !== void 0 ? _b : 0) <= member.roles.highest.position) {
            interaction.reply((0, GenUtils_1.errorEmbed)("I am unable to issue a ban to this user."));
            return;
        }
        if (interaction.member.roles.highest.position <= member.roles.highest.position || interaction.user.id == member.id) {
            interaction.reply((0, GenUtils_1.errorEmbed)("You are unable to issue a ban to this user."));
            return;
        }
    }
    const caseNumber = await (0, GenUtils_1.incrimentCase)(interaction.guild);
    const newCase = new Case_1.default({
        guildID: interaction.guild.id,
        userID: user.id,
        modID: interaction.user.id,
        caseNumber: caseNumber,
        caseType: "BAN",
        reason: reason,
        duration: length[1],
        durationUnix: lengthNum,
        active: true,
        dateIssued: Date.now()
    });
    newCase.save().catch((err) => {
        (0, GenUtils_1.handleError)(err);
    });
    const newBans = new Bans_1.default({
        guildID: interaction.guild.id,
        userID: user.id,
        caseNumber: caseNumber,
        endDate: lengthNum,
        moderator: {
            username: interaction.user.username,
            id: interaction.user.id
        },
        target: {
            username: user.username,
            id: user.id,
        },
        guild: {
            name: interaction.guild.name,
            id: interaction.guildId
        },
        reason: reason,
        at: new Date()
    });
    newBans.save().catch((err) => {
        console.log('UNABLE TO SAVE ', err);
        (0, GenUtils_1.handleError)(err);
    });
    const warns = await Case_1.default.countDocuments({
        guildID: interaction.guild.id,
        userID: user.id,
        caseType: "WARN",
        active: true,
    });
    const settings = await Settings_1.default.findOne({ guildID: interaction.guild.id });
    const banEmbed = new discord_js_1.EmbedBuilder()
        .setDescription(`**Case:** #${caseNumber} | **Mod:** ${interaction.user.username} | **Reason:** ${reason} | **Duration:** ${length[1]}`)
        .setColor("Green");
    interaction.reply({ content: `${config_1.config.arrowEmoji} **${user.username}** has been banned. (**${warns}** warns)`, embeds: [banEmbed] });
    await interaction.channel.send((_c = settings === null || settings === void 0 ? void 0 : settings.banImageLink) !== null && _c !== void 0 ? _c : "https://cdn.discordapp.com/attachments/748967203969433711/1322768055658479626/vro_banned.gif").catch((err) => { }); // default behavior should send 
    const youAreBanned = new discord_js_1.EmbedBuilder()
        .setAuthor({ name: `You have been banned from ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() || undefined })
        .setDescription(`${config_1.config.bulletpointEmoji} **Reason:** ${reason}
			${config_1.config.bulletpointEmoji} **Duration:** ${length[1]}
			${config_1.config.bulletpointEmoji} **Case Number:** #${caseNumber}
			
			If you believe this is a mistake, or unjustified, you may fill out an appeal at https://discord.gg/w6ynsuFneT.`)
        .setColor("Green")
        .setTimestamp();
    await user.send({ embeds: [youAreBanned] }).catch((err) => { console.log("Uh oh!\n" + err.stack); });
    await interaction.guild.bans.create(user, { reason: `Mod: ${interaction.user.username}\nReason: ${reason}`, deleteMessageSeconds: hard ? 86400 : 0 });
    await (0, GenUtils_1.sendModLogs)({ guild: interaction.guild, mod: interaction.member, targetUser: user, action: "Ban" }, { title: "User Banned", actionInfo: `**Reason:** ${reason}\n> **Duration:** ${length[1]}\n> **Case ID:** ${caseNumber}`, channel: interaction.channel || undefined });
});
