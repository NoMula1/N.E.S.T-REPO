"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("avatar")
    .setDescription("Get a user's enlarged avatar.")
    .addUserOption(option => option
    .setName("user")
    .setDescription("Get any user's avatar!")
    .setRequired(false))
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.None,
})
    .setExecutor(async (interaction) => {
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    let user = interaction.options.getUser("user");
    if (!user) {
        user = interaction.user;
    }
    const avatarEmbed = new discord_js_1.EmbedBuilder()
        .setAuthor({ name: `${user.tag}'s Avatar`, iconURL: user.displayAvatarURL() || undefined })
        .setColor("Random")
        .setImage(user.displayAvatarURL({ size: 512 }) || null)
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() || undefined });
    interaction.reply({ embeds: [avatarEmbed] });
});
