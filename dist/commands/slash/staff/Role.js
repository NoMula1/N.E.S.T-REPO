"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const GenUtils_1 = require("../../../utils/GenUtils");
const config_1 = require("../../../utils/config");
const authorized_list = [
    '1149913737558499358', // t9knightnight
    '140163987500302336', // cj 
    '348174855755137027' // Shooter
    // where is lanjt, a-holes!!
];
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("role")
    .setDescription("Add a role to a user")
    .addUserOption(opt => opt.setName("user")
    .setDescription("User to add the specified role to")
    .setRequired(true))
    .addRoleOption(opt => opt.setName("role")
    .setDescription("Role to add to the specified user")
    .setRequired(true))
    .setDefaultMemberPermissions(BigInt(0x0004000000000000)) // USE_EXTERNAL_APPS: https://discord.com/developers/docs/topics/permissions#permissions-bitwise-permission-flags
    .setBasePermission({
    HasRole: ['1203544113501437952', '1274077734171316315'], // Senior Marketplace Moderator, Senior Ranker (Role for giving out ranking roles)
    Level: CommandExecutor_1.PermissionLevel.Moderator
})
    .setExecutor(async (interaction) => {
    var _a, _b, _c, _d;
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    const role = interaction.options.getRole("role");
    const user = interaction.options.getUser("user");
    const member = interaction.guild.members.cache.get(user === null || user === void 0 ? void 0 : user.id);
    const trustedHelper = interaction.guild.roles.cache.find(role => role.name.toLowerCase() === "trusted helper");
    if (!role || !user || !interaction.guild) {
        interaction.reply({ content: "You must use this on a valid role/user!", ephemeral: true });
        return;
    }
    if (role.rawPosition >= ((_a = trustedHelper === null || trustedHelper === void 0 ? void 0 : trustedHelper.rawPosition) !== null && _a !== void 0 ? _a : 192) && !authorized_list.includes(interaction.member.id)) { // check if theyre authed first
        interaction.reply((0, GenUtils_1.errorEmbed)("You cant give / remove this role")); // make sure they cant give out a role they arent supposed to
        return;
    }
    if (role) {
        if (member && (((_b = interaction.guild.members.me) === null || _b === void 0 ? void 0 : _b.roles.highest.position) <= role.position)) {
            interaction.reply((0, GenUtils_1.errorEmbed)("I am unable to assign this role as it is higher than my highest role."));
            return;
        }
        if (interaction.member.roles.highest.position <= role.position) {
            interaction.reply((0, GenUtils_1.errorEmbed)("You are unable to assign this role as it is higher or equal to your highest role."));
            return;
        }
    }
    if (role.permissions.has(discord_js_1.PermissionFlagsBits.Administrator)) {
        if (!interaction.member.permissions.has(discord_js_1.PermissionFlagsBits.Administrator)) {
            await interaction.reply((0, GenUtils_1.errorEmbed)("This role has administrator permissions and cant be given"));
            return;
        }
    }
    const add = new discord_js_1.EmbedBuilder()
        .setColor("Purple")
        .setDescription(`${config_1.config.successEmoji}<@&${role.id}> added to user <@${user.id}> successfully!`);
    const remove = new discord_js_1.EmbedBuilder()
        .setColor("Purple")
        .setDescription(`<@&${role.id}> removed from user <@${user.id}> successfully!`);
    if (!((_c = interaction.guild.members.cache.get(user.id)) === null || _c === void 0 ? void 0 : _c.roles.cache.has(role.id))) { // give roles if they dont have it
        await ((_d = interaction.guild.members.cache.get(user.id)) === null || _d === void 0 ? void 0 : _d.roles.add(role.id));
        await interaction.reply({ embeds: [add] });
        await (0, GenUtils_1.sendModLogs)({ guild: interaction.guild, mod: interaction.member, targetUser: user, action: "Ban" }, { title: "Role Added", actionInfo: `**Role Name**: ${role.name}` });
        return;
    }
    await (member === null || member === void 0 ? void 0 : member.roles.remove(role.id)); // remove roles if they have it
    await interaction.reply({ embeds: [remove] });
    await (0, GenUtils_1.sendModLogs)({ guild: interaction.guild, mod: interaction.member, targetUser: user, action: "Ban" }, { title: "Role Removed", actionInfo: `**Role Name**: ${role.name}` });
    return;
});
