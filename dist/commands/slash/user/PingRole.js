"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const userCD = new Map();
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("pingrole")
    .setDescription("Ping help roles for help")
    .addStringOption(opt => opt.setName("role")
    .setDescription("Role to ping")
    .setRequired(true)
    .addChoices({ name: 'Scripting', value: '1480457270285566086' }, { name: 'Advanced Scripting', value: '1480457221975445605' }, { name: 'Modeling', value: '1480459000662462495' }, { name: 'Building', value: '1480459532013535345' }, { name: 'Animation', value: '1480456771045687508' }, { name: 'General', value: '1480456771045687508' }))
    .addStringOption(opt => opt.setName("messagelink")
    .setDescription("Enter the link to the message you need help with")
    .setRequired(true))
    .setBasePermission({ Level: CommandExecutor_1.PermissionLevel.None })
    .setExecutor(async (interaction) => {
    if (!interaction.inCachedGuild())
        return;
    const role = interaction.options.getString("role");
    const messageLink = interaction.options.getString("messagelink");
    const userId = interaction.user.id;
    if (userCD.has(userId)) {
        interaction.reply({ content: 'You are on cooldown, please wait before asking for help', ephemeral: true });
        return;
    }
    if (!role) {
        interaction.reply({ content: "Help role is invalid", ephemeral: true });
        return;
    }
    if (!messageLink) {
        interaction.reply({ content: "Invalid message link.", ephemeral: true });
        return;
    }
    const isValidLink = /^https?:\/\/(www\.)?discord(app)?\.com\/channels\/(\d{17,19})\/(\d{17,19})\/(\d{17,19})$/.test(messageLink);
    if (!isValidLink) {
        interaction.reply({ content: "Invalid message link.", ephemeral: true });
        return;
    }
    const roleid = role;
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle("Help Requested!")
        .setDescription(`**<@${interaction.user.id}>** has requested help from **<@&${roleid}>**.\n\n[Click here to view the referenced message](${messageLink})`)
        .setColor(0x2F3136);
    await interaction.reply({ embeds: [embed], content: (0, discord_js_1.roleMention)(roleid), allowedMentions: { roles: [roleid] } });
    userCD.set(userId, setTimeout(() => {
        userCD.delete(userId);
    }, 3600000));
});
