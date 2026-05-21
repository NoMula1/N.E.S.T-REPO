"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
exports.default = {
    name: discord_js_1.Events.InteractionCreate,
    once: false,
    execute: async (_, interaction) => {
        if (!interaction.isButton())
            return;
        if (interaction.customId !== 'message-report-reviewed')
            return;
        const embed = new discord_js_1.EmbedBuilder(interaction.message.embeds[0].data);
        embed.setTitle("~~Message Report~~");
        embed.setColor(discord_js_1.Colors.Green);
        await interaction.update({
            content: `Report resolved by <@${interaction.user.id}>.`,
            embeds: [embed],
            components: []
        });
    }
};
