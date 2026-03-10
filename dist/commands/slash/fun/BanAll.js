"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const config_1 = require("../../../utils/config");
// Not literal, does not actually ban users!
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("ban_all")
    .setDescription("ban all users")
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.BanMembers)
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.Administrator
})
    .setExecutor(async (interaction) => {
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    const banEmbed = new discord_js_1.EmbedBuilder()
        .setDescription(`**Case:** #69 | **Mod:** ${interaction.user.username}`)
        .setColor("Green");
    interaction.reply({ content: `${config_1.config.arrowEmoji} Banning all **${interaction.guild.memberCount}** members.`, embeds: [banEmbed], fetchReply: true });
});
