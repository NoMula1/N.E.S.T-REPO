"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportPing = void 0;
const discord_js_1 = require("discord.js");
const logging_1 = require("../../utils/logging");
exports.reportPing = "<@&1079439643814141993>";
exports.default = {
    name: discord_js_1.Events.InteractionCreate,
    once: false,
    async execute(_, i) {
        if (!i.isModalSubmit())
            return;
        if (!i.customId.startsWith("report-message-submit"))
            return;
        if (!i.channel)
            return;
        await i.deferReply({
            flags: discord_js_1.MessageFlags.Ephemeral
        });
        const reportsChannel = i.guild.channels.cache.find((c) => c.type === discord_js_1.ChannelType.GuildText && c.name === "reports");
        if (!reportsChannel) {
            logging_1.Log.error("Missing reports for reported messages!");
            i.channel.send("<@&1177007392668536873> Missing reports channel!\n- Must be named reports\n- Must be a staff channel");
            return;
        }
        const messageId = i.customId.split("-")[3];
        const message = await i.channel.messages.fetch(messageId);
        message.react('⚠');
        i.editReply({ content: `User <@${message.author.id}> has succesfully been reported, and mods have been notified. Thanks for helping keep NIGHTHAWK SERVERS safe.` });
        await reportsChannel.send(({
            content: exports.reportPing,
            embeds: [
                new discord_js_1.EmbedBuilder()
                    .setTitle("Message Report")
                    .setDescription(`Reporter: <@${i.user.id}>\nReason:\n\`\`\`\n${i.fields.getTextInputValue('reason')}\n\`\`\`\nJump: ${message.url}\nMessage:\n\`\`\`\n${message.content.replace('`', '\`')}\n\`\`\``)
                    .setColor(discord_js_1.Colors.Red)
            ],
            components: [
                new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
                    .setCustomId(`message-report-reviewed`)
                    .setLabel("Mark as Resolved")
                    .setStyle(discord_js_1.ButtonStyle.Success))
            ]
        }));
    }
};
