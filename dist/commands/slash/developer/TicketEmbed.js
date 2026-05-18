"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const GuildConfigCache_1 = require("../../../utils/GuildConfigCache");
const TICKET_BUTTONS = [
    { configKey: 'ticketsCategoryGeneral', customId: 'open_ticket_general', label: 'General Support', emoji: '🎟' },
    { configKey: 'ticketsCategoryTrading', customId: 'open_ticket_trading', label: 'Trading/Scam Report', emoji: '🚨' },
    { configKey: 'ticketsCategoryMarket', customId: 'open_ticket_market', label: 'Market Scam Report', emoji: '🏪' },
    { configKey: 'ticketsCategoryBusiness', customId: 'open_ticket_business', label: 'Business Inquiries', emoji: '💼' },
    { configKey: 'internalAffairs', customId: 'open_internal_affair', label: 'Internal Affairs', emoji: '🔒' },
];
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("sendticketembed")
    .setDescription("Send the \"Open a Ticket\" embed.")
    .setBasePermission({ Level: CommandExecutor_1.PermissionLevel.Administrator })
    .addChannelOption(opt => opt.setName("channel").setDescription("Channel to send the embed in.").setRequired(true))
    .setExecutor(async (interaction) => {
    var _a;
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    const channel = interaction.options.getChannel("channel");
    if (!channel || channel.type !== discord_js_1.ChannelType.GuildText) {
        interaction.reply({ content: "Invalid channel provided!", ephemeral: true });
        return;
    }
    const guildCfg = await (0, GuildConfigCache_1.getGuildConfig)(interaction.guildId);
    const channels = (_a = guildCfg === null || guildCfg === void 0 ? void 0 : guildCfg.channels) !== null && _a !== void 0 ? _a : {};
    // Build one button per configured ticket category
    const buttons = TICKET_BUTTONS
        .filter(b => !!channels[b.configKey])
        .map(b => new discord_js_1.ButtonBuilder()
        .setStyle(discord_js_1.ButtonStyle.Primary)
        .setLabel(b.label)
        .setCustomId(b.customId)
        .setEmoji(b.emoji));
    if (buttons.length === 0) {
        interaction.reply({ content: "No ticket categories are configured yet. Set them in the NEST dashboard (Channels → Ticket Categories) first.", ephemeral: true });
        return;
    }
    // Discord allows max 5 buttons per row; split into rows of 5
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new discord_js_1.ActionRowBuilder().addComponents(...buttons.slice(i, i + 5)));
    }
    const ticketEmbed = new discord_js_1.EmbedBuilder()
        .setTitle("Contact Staff")
        .setDescription(`Need to contact staff to report someone, inquire about the server, or ask about partnerships? Here's the place to do it!\n` +
        `https://nohello.net/`)
        .addFields({
        name: 'Important Information',
        value: `- If you opened a ticket by mistake, leave a short message and close it.\n`
            + `- Do **not** beg for roles\n`
            + `- Please do not ping staff, we have already been alerted`
    }, {
        name: 'What are Internal Affairs?',
        value: `Use the Internal Affairs button to report staff misconduct or other staff grievances. `
            + `All content in these tickets is kept as confidential as possible. `
            + `**Use this feature to report staff misconduct or other staff grievances.**`
    })
        .setColor("Green");
    const webhook = await channel.createWebhook({ name: "Ticket System", avatar: interaction.guild.iconURL() || undefined });
    await webhook.send({ embeds: [ticketEmbed], components: rows }).catch(() => { });
    interaction.reply({ content: `Embed sent to <#${channel.id}> with ${buttons.length} button(s).`, ephemeral: true });
});
