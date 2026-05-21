"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const logging_1 = require("../../utils/logging");
const GuildConfigCache_1 = require("../../utils/GuildConfigCache");
const isSnowflake = (id) => typeof id === 'string' && /^\d{17,20}$/.test(id);
exports.default = {
    name: discord_js_1.Events.InteractionCreate,
    once: false,
    async execute(_, i) {
        var _a, _b, _c, _d;
        if (!i.isModalSubmit())
            return;
        if (!i.customId.startsWith('report-message-submit'))
            return;
        if (!i.channel || !i.guild)
            return;
        await i.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
        // Resolve reports channel from guild config
        const guildCfg = await (0, GuildConfigCache_1.getGuildConfig)(i.guildId);
        const reportsChannelId = (_a = guildCfg === null || guildCfg === void 0 ? void 0 : guildCfg.channels) === null || _a === void 0 ? void 0 : _a.reports;
        const reportsChannel = isSnowflake(reportsChannelId)
            ? (_b = i.guild.channels.cache.get(reportsChannelId)) !== null && _b !== void 0 ? _b : await i.guild.channels.fetch(reportsChannelId).catch(() => null)
            : i.guild.channels.cache.find(c => c.type === discord_js_1.ChannelType.GuildText && c.name === 'reports');
        if (!reportsChannel) {
            logging_1.Log.error(`[${i.guildId}] Missing reports channel — configure it in the NEST dashboard.`);
            await i.editReply({ content: 'The reports channel is not configured for this server. Please contact an administrator.' });
            return;
        }
        // Resolve ping role from guild config (Moderator or SeniorModerator)
        const pingRoleId = ((_c = guildCfg === null || guildCfg === void 0 ? void 0 : guildCfg.roles) === null || _c === void 0 ? void 0 : _c.Moderator) || ((_d = guildCfg === null || guildCfg === void 0 ? void 0 : guildCfg.roles) === null || _d === void 0 ? void 0 : _d.AssistantModerator);
        const pingMention = isSnowflake(pingRoleId) ? `<@&${pingRoleId}>` : '@here';
        const messageId = i.customId.split('-')[3];
        const message = await i.channel.messages.fetch(messageId).catch(() => null);
        if (!message) {
            await i.editReply({ content: 'Could not find the reported message.' });
            return;
        }
        await message.react('⚠').catch(() => { });
        await i.editReply({ content: `User <@${message.author.id}> has been reported and mods have been notified. Thanks for helping keep the server safe.` });
        await reportsChannel.send({
            content: pingMention,
            embeds: [
                new discord_js_1.EmbedBuilder()
                    .setTitle('Message Report')
                    .setDescription(`**Reporter:** <@${i.user.id}>\n**Reason:**\n\`\`\`\n${i.fields.getTextInputValue('reason')}\n\`\`\`\n**Jump:** ${message.url}\n**Message:**\n\`\`\`\n${message.content.replace(/`/g, '\\`')}\n\`\`\``)
                    .setColor(discord_js_1.Colors.Red)
            ],
            components: [
                new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
                    .setCustomId('message-report-reviewed')
                    .setLabel('Mark as Resolved')
                    .setStyle(discord_js_1.ButtonStyle.Success))
            ]
        });
    }
};
