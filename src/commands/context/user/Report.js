"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const ContextCommandExecutor_1 = require("../../../utils/ContextCommandExecutor");
const cooldown = new Map();
let globalUsages = 0;
exports.default = new ContextCommandExecutor_1.MessageContextCommandExecutor()
    .setName("Report Message")
    .setExecutor(async (interaction) => {
    if (cooldown.get(interaction.user.id)) {
        await interaction.reply({
            ephemeral: true,
            embeds: [
                new discord_js_1.EmbedBuilder()
                    .setTitle('Under Cooldown')
                    .setColor("Red")
                    .setDescription('This command is under cooldown for you! Please wait before using it again.')
            ]
        });
        return;
    }
    if (globalUsages >= 3) {
        await interaction.reply({
            ephemeral: true,
            embeds: [
                new discord_js_1.EmbedBuilder()
                    .setTitle('Under Cooldown')
                    .setColor("Red")
                    .setDescription('This command is under cooldown for the entire server! If you need immediate assistance, try pinging an online moderator.')
            ]
        });
        return;
    }
    await interaction.showModal(new discord_js_1.ModalBuilder()
        .setCustomId('report-message-submit-' + interaction.targetMessage.id)
        .setTitle(`Report Message Info`)
        .addComponents(new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Report Reason')
        .setMinLength(5)
        .setRequired(true)
        .setStyle(discord_js_1.TextInputStyle.Paragraph))));
    setTimeout(() => {
        globalUsages -= 1;
        cooldown.delete(interaction.user.id);
    }, 900000);
});
