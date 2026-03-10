"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const GlobalScope_1 = require("../../../bootstrap/GlobalScope");
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("userinfo")
    .setDescription("Get information on a user.")
    .addUserOption(option => option
    .setName("user")
    .setDescription("Get any user's information!")
    .setRequired(false))
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.None,
    Scope: GlobalScope_1.Scope.Admin
})
    .setExecutor(async (interaction) => {
    var _a, _b, _c, _d;
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    let user = interaction.options.getUser("user");
    let member = interaction.options.getMember("user");
    if (!user) {
        user = interaction.user;
        member = interaction.member;
    }
    let nickname;
    let joinedAt;
    let highestRole;
    if (member) {
        if (member.nickname) {
            nickname = member.nickname;
        }
        else {
            nickname = user.globalName;
        }
        joinedAt = `<t:${Math.floor(((_a = member.joinedAt) === null || _a === void 0 ? void 0 : _a.getTime()) / 1000)}:D> (<t:${Math.floor(((_b = member.joinedAt) === null || _b === void 0 ? void 0 : _b.getTime()) / 1000)}:R>)`;
        highestRole = `<@&${member.roles.highest.id}> (${member.roles.highest.position})`;
    }
    else {
        nickname = "Not Cached/Not in Server";
        joinedAt = "Not Cached/Not in Server";
        highestRole = "Not Cached/ Not in Server";
    }
    const fetchedFlags = (await user.fetchFlags()).toArray();
    const badges = [];
    for (const badge of fetchedFlags) {
        if (fetchedFlags.length == 0) {
            badges.push("None...");
        }
        if (badge == "Staff")
            badges.push(" <:staff:996115760579620974>");
        if (badge == "Partner")
            badges.push(" <:PartneredServerOwner:1044190723198697493>");
        if (badge == "Hypesquad")
            badges.push(" <:HypesquadEvents:1044190722292711464>");
        if (badge == "BugHunterLevel1")
            badges.push(" <:BugHunterLv1:1044190721197998100>");
        if (badge == "BugHunterLevel2")
            badges.push(" <:BugHunderLv2:1044190719943913502>");
        if (badge == "HypeSquadOnlineHouse1")
            badges.push(" <:Bravery:1044190718719164476>");
        if (badge == "HypeSquadOnlineHouse2")
            badges.push(" <:Brilliance:1044190717876117545>");
        if (badge == "HypeSquadOnlineHouse3")
            badges.push(" <:Balance:1044190716735275008>");
        if (badge == "PremiumEarlySupporter")
            badges.push(" <:EarlySupporter:1044190715195957258>");
        if (badge == "VerifiedBot")
            badges.push(" <:VerifiedBot:1044190727174897726>");
        if (badge == "VerifiedDeveloper")
            badges.push(" <:EarlyVerifiedBotDeveloper:1044190725237129216>");
        if (badge == "CertifiedModerator")
            badges.push(" <:CertifiedModerator:1044190723798478870>");
        if (badge == "ActiveDeveloper")
            badges.push(" <:ActiveDeveloper:1044190726327631942>");
    }
    if (badges.length <= 0) {
        badges.push("None...");
    }
    const userInfoEmbed = new discord_js_1.EmbedBuilder()
        .setAuthor({ name: `Who is ${user.tag}`, iconURL: user.displayAvatarURL() || undefined })
        .setThumbnail(user.displayAvatarURL() || null)
        .setColor("Random")
        .addFields({ name: "Name:", value: `${user.tag}`, inline: true }, { name: "Badges:", value: `${badges}` }, {
        name: "General Information:", value: `**Mention:** <@${user.id}>
					**ID:** ${user.id}
					**Is Bot:** ${user.bot}
					**Highest Role:** ${highestRole}
					**Avatar:** [View Here](${user.displayAvatarURL({ size: 512 })})
					**Display Name:** ${nickname}`, inline: false
    }, { name: "📆 Created:", value: `<t:${Math.floor(((_c = user.createdAt) === null || _c === void 0 ? void 0 : _c.getTime()) / 1000)}:D> (<t:${Math.floor(((_d = user.createdAt) === null || _d === void 0 ? void 0 : _d.getTime()) / 1000)}:R>)`, inline: true }, { name: "📆 Joined:", value: `${joinedAt}`, inline: true })
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() || undefined });
    interaction.reply({ embeds: [userInfoEmbed] });
});
