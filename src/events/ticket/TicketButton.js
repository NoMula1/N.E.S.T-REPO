"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = require("../../utils/logging");
const discord_js_1 = require("discord.js");
const GenUtils_1 = require("../../utils/GenUtils");
const Tickets_1 = __importDefault(require("../../schemas/Tickets"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const config_1 = require("../../utils/config");
const lodash_1 = require("lodash");
const TicketStatus_1 = __importDefault(require("../../schemas/TicketStatus"));
const TicketStatusUpdate_1 = require("./TicketStatusUpdate");
const FastFlag_1 = __importDefault(require("../../schemas/FastFlag"));
const GuildConfigCache_1 = require("../../utils/GuildConfigCache");
// Ticket numbers to skip (reserved/sensitive numbers)
const SkipTickets = [1488, 69, 420, 69420, 67, 6767];
// Guard: true only for valid Discord snowflakes
const isSnowflake = (id) => typeof id === 'string' && /^\d{17,20}$/.test(id);
// Build a consistent transcript path for a channel
const transcriptDir = (channelId) => path_1.default.join(__dirname, '../..', 'transcripts', channelId);
/* ────────────────────────────────────────────────────────────────
   Permission-overwrite helpers
   Always pass actual Role / GuildMember objects so Discord.js
   never has to resolve raw string IDs from the cache.
──────────────────────────────────────────────────────────────── */
function baseOverwrites(guild, member) {
    // @everyone deny — use the cached Role object, never a raw string
    return [
        {
            id: guild.roles.everyone,
            type: discord_js_1.OverwriteType.Role,
            deny: [
                discord_js_1.PermissionsBitField.Flags.ViewChannel,
                discord_js_1.PermissionsBitField.Flags.SendMessages,
                discord_js_1.PermissionsBitField.Flags.ReadMessageHistory,
            ],
        },
        {
            // Pass the GuildMember object directly — no cache lookup by Discord.js
            id: member,
            type: discord_js_1.OverwriteType.Member,
            allow: [
                discord_js_1.PermissionsBitField.Flags.ViewChannel,
                discord_js_1.PermissionsBitField.Flags.SendMessages,
                discord_js_1.PermissionsBitField.Flags.ReadMessageHistory,
                discord_js_1.PermissionsBitField.Flags.AttachFiles,
            ],
        },
    ];
}
function roleOverwrite(role) {
    return {
        id: role,
        type: discord_js_1.OverwriteType.Role,
        allow: [
            discord_js_1.PermissionsBitField.Flags.ViewChannel,
            discord_js_1.PermissionsBitField.Flags.SendMessages,
            discord_js_1.PermissionsBitField.Flags.ReadMessageHistory,
        ],
    };
}
/* ────────────────────────────────────────────────────────────────
   Ticket-type map
──────────────────────────────────────────────────────────────── */
const TICKET_TYPE_MAP = {
    'open_ticket': { configKey: 'ticketsCategoryGeneral', channelPrefix: 'ticket' },
    'open_ticket_general': { configKey: 'ticketsCategoryGeneral', channelPrefix: 'ticket' },
    'open_ticket_trading': { configKey: 'ticketsCategoryTrading', channelPrefix: 'report' },
    'open_ticket_market': { configKey: 'ticketsCategoryMarket', channelPrefix: 'market' },
    'open_ticket_business': { configKey: 'ticketsCategoryBusiness', channelPrefix: 'inquiry' },
};
/* ────────────────────────────────────────────────────────────────
   Shared: increment ticket num, skipping reserved numbers
──────────────────────────────────────────────────────────────── */
async function nextTicketNum(guild) {
    let num = await (0, GenUtils_1.incrimentTicket)(guild);
    if (SkipTickets.includes(num)) {
        logging_1.Log.debug(`Ticket #${num} skipped (reserved).`);
        num = await (0, GenUtils_1.incrimentTicket)(guild);
    }
    return num;
}
/* ────────────────────────────────────────────────────────────────
   Shared: create transcript files on disk
──────────────────────────────────────────────────────────────── */
function createTranscriptFiles(channelId, creatorId) {
    const dir = transcriptDir(channelId);
    try {
        (0, fs_1.mkdirSync)(dir, { recursive: true });
        (0, fs_1.writeFileSync)(`${dir}/ticket_meta.json`, JSON.stringify({ creator: creatorId, ticketID: channelId, date: new Date() }));
        (0, fs_1.writeFileSync)(`${dir}/ticket_transcript.md`, '');
        (0, fs_1.writeFileSync)(`${dir}/ticket_transcript.txt`, '');
        (0, fs_1.mkdirSync)(path_1.default.join(dir, 'media'), { recursive: true });
        return true;
    }
    catch (err) {
        logging_1.Log.error(err);
        (0, fs_1.rmSync)(dir, { recursive: true, force: true });
        return false;
    }
}
/* ════════════════════════════════════════════════════════════════
   Main event handler
════════════════════════════════════════════════════════════════ */
exports.default = {
    name: discord_js_1.Events.InteractionCreate,
    once: false,
    async execute(_, interaction) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17;
        if (!interaction.inCachedGuild())
            return;
        /* ── Button interactions ── */
        if (interaction.isButton()) {
            const buttonID = interaction.customId;
            /* ── Standard ticket-category buttons ── */
            if (TICKET_TYPE_MAP[buttonID]) {
                const { configKey, channelPrefix } = TICKET_TYPE_MAP[buttonID];
                await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
                // Feature flag: tickets disabled via FastFlag
                const ticketsDisabled = await FastFlag_1.default.findOne({ refName: 'DisableTicketOpening', enabled: true });
                if (ticketsDisabled) {
                    await interaction.editReply({ content: 'Tickets are currently disabled. Please try again later.' });
                    return;
                }
                // Feature flag: tickets disabled in guild config
                const guildCfg = await (0, GuildConfigCache_1.getGuildConfig)(interaction.guildId);
                if (((_a = guildCfg === null || guildCfg === void 0 ? void 0 : guildCfg.features) === null || _a === void 0 ? void 0 : _a.tickets) === false) {
                    await interaction.editReply({ content: 'Tickets are currently disabled. Please try again later.' });
                    return;
                }
                // Ticket ban check
                if (interaction.member.roles.cache.find((r) => r.name.toLowerCase() === 'ticket banned')) {
                    await interaction.editReply((0, GenUtils_1.errorEmbed)('You are banned from opening tickets.'));
                    return;
                }
                // Duplicate open ticket check
                const findTicket = await Tickets_1.default.findOne({ guildID: interaction.guild.id, creatorID: interaction.user.id, status: true });
                if (findTicket) {
                    const existing = interaction.guild.channels.cache.get(findTicket.channelID);
                    if (existing) {
                        await interaction.editReply((0, GenUtils_1.errorEmbed)('You already have a ticket open.'));
                        return;
                    }
                    await findTicket.deleteOne();
                }
                // Resolve category — bust cache if not present (dashboard may have just updated)
                let activeCfg = guildCfg;
                let catId = (_b = activeCfg === null || activeCfg === void 0 ? void 0 : activeCfg.channels) === null || _b === void 0 ? void 0 : _b[configKey];
                if (!isSnowflake(catId)) {
                    (0, GuildConfigCache_1.invalidateGuildConfig)(interaction.guildId);
                    activeCfg = await (0, GuildConfigCache_1.getGuildConfig)(interaction.guildId);
                    catId = (_c = activeCfg === null || activeCfg === void 0 ? void 0 : activeCfg.channels) === null || _c === void 0 ? void 0 : _c[configKey];
                }
                if (!isSnowflake(catId)) {
                    await interaction.editReply((0, GenUtils_1.errorEmbed)("This ticket category isn't configured yet. Please contact an administrator."));
                    return;
                }
                // Prefer cache, fall back to API fetch
                const category = (_e = ((_d = interaction.guild.channels.cache.get(catId)) !== null && _d !== void 0 ? _d : (await interaction.guild.channels.fetch(catId).catch(() => null)))) !== null && _e !== void 0 ? _e : undefined;
                if (!category) {
                    await interaction.editReply((0, GenUtils_1.errorEmbed)('Ticket category channel not found. Please verify the configuration.'));
                    return;
                }
                // Staff role — resolve to actual Role object
                const rawStaffRoleId = ((_f = activeCfg === null || activeCfg === void 0 ? void 0 : activeCfg.roles) === null || _f === void 0 ? void 0 : _f.AssistantModerator) || ((_g = activeCfg === null || activeCfg === void 0 ? void 0 : activeCfg.roles) === null || _g === void 0 ? void 0 : _g.Moderator) || null;
                const staffRole = isSnowflake(rawStaffRoleId)
                    ? ((_h = interaction.guild.roles.cache.get(rawStaffRoleId)) !== null && _h !== void 0 ? _h : null)
                    : null;
                const ticketNum = await nextTicketNum(interaction.guild);
                // Build overwrites using actual objects (no raw string IDs)
                const permOverwrites = baseOverwrites(interaction.guild, interaction.member);
                if (staffRole)
                    permOverwrites.push(roleOverwrite(staffRole));
                const newChannel = await interaction.guild.channels.create({
                    name: `${channelPrefix}-${ticketNum}`,
                    type: discord_js_1.ChannelType.GuildText,
                    permissionOverwrites: permOverwrites,
                    reason: `Ticket opened by ${interaction.user.username}.`,
                    parent: category,
                }).catch(async (err) => {
                    await interaction.editReply((0, GenUtils_1.errorEmbed)('Unable to create ticket channel! Please try again.'));
                    logging_1.Log.error(err);
                    return null;
                });
                if (!newChannel)
                    return;
                if (!createTranscriptFiles(newChannel.id, interaction.user.id)) {
                    await interaction.editReply((0, GenUtils_1.errorEmbed)('Unable to create ticket transcript!'));
                    await newChannel.delete().catch(() => { });
                    return;
                }
                const ticketRow = new discord_js_1.ActionRowBuilder()
                    .addComponents(new discord_js_1.ButtonBuilder().setCustomId('close_ticket').setStyle(discord_js_1.ButtonStyle.Danger).setLabel('Close Ticket').setEmoji('✖'));
                const ticketEmbed = new discord_js_1.EmbedBuilder()
                    .setAuthor({ name: `${interaction.user.username}'s Ticket`, iconURL: interaction.user.displayAvatarURL() || undefined })
                    .setColor('Green')
                    .setDescription('Please describe why you opened this ticket, a staff member will be with you shortly.\n\nIf you opened this ticket by mistake, leave a short response and close the ticket.')
                    .setTimestamp()
                    .setFooter({ text: 'Ticket transcripts are saved permanently.' });
                await newChannel.send({ content: `<@${interaction.user.id}> https://nohello.net`, embeds: [ticketEmbed], components: [ticketRow] });
                const newTicket = new Tickets_1.default({
                    guildID: interaction.guild.id,
                    creatorID: interaction.user.id,
                    users: [],
                    channelID: newChannel.id,
                    claimedID: 'None',
                    closeReason: 'None',
                    status: true,
                    autoClose: 0,
                });
                await newTicket.save().catch(async (err) => {
                    await interaction.editReply((0, GenUtils_1.errorEmbed)('Failed to create ticket file!'));
                    logging_1.Log.error(err);
                    await newChannel.delete().catch((e) => { logging_1.Log.error('Failed to delete ticket channel!\n\n' + e.stack); });
                });
                await interaction.editReply({ content: `Your ticket has been created. <#${newChannel.id}>` });
                return;
            }
            /* ── Non-ticket-type buttons ── */
            switch (buttonID) {
                /* ── Internal Affairs prompt ── */
                case 'open_internal_affair': {
                    const embed = new discord_js_1.EmbedBuilder()
                        .setTitle('New Internal Affair Report')
                        .setColor('Red')
                        .setDescription('This feature will open a ticket, used to report staff misconduct or staff grievances. '
                        + 'This ticket will only be able to be viewed by Internal Reviewers.'
                        + '\n\n**Click "Open Ticket" below to acknowledge this feature\'s intended usage**, and to open an Internal Affair Ticket.');
                    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setLabel('Nevermind').setCustomId('internal-affair-nevermind').setStyle(discord_js_1.ButtonStyle.Danger), new discord_js_1.ButtonBuilder().setLabel('Open Ticket').setCustomId('internal-affair-open-ticket').setStyle(discord_js_1.ButtonStyle.Primary));
                    await interaction.reply({ flags: discord_js_1.MessageFlags.Ephemeral, embeds: [embed], components: [row] });
                    break;
                }
                /* ── Internal Affairs: nevermind ── */
                case 'internal-affair-nevermind': {
                    await interaction.update({ embeds: [], components: [], content: "Ok, I've cancelled your request." });
                    break;
                }
                /* ── Internal Affairs: open ticket ── */
                case 'internal-affair-open-ticket': {
                    await interaction.update({ embeds: [], components: [], content: 'Opening a ticket…' });
                    const ticketsDisabled = await FastFlag_1.default.findOne({ refName: 'DisableTicketOpening', enabled: true });
                    if (ticketsDisabled) {
                        await interaction.editReply({ content: 'Tickets are currently disabled. Please try again later.' });
                        return;
                    }
                    if (interaction.member.roles.cache.find((r) => r.name.toLowerCase() === 'ticket banned')) {
                        await interaction.editReply((0, GenUtils_1.errorEmbed)('You are banned from opening tickets.'));
                        return;
                    }
                    // Duplicate ticket check
                    const findTicket = await Tickets_1.default.findOne({ guildID: interaction.guild.id, creatorID: interaction.user.id, status: true });
                    if (findTicket) {
                        const existing = await interaction.guild.channels.fetch(findTicket.channelID).catch(() => null);
                        if (existing) {
                            await interaction.editReply((0, GenUtils_1.errorEmbed)('You already have a ticket open.'));
                            return;
                        }
                        await findTicket.deleteOne();
                    }
                    // Resolve Internal Affairs category
                    const iaCfg = await (0, GuildConfigCache_1.getGuildConfig)(interaction.guildId);
                    const iaCatId = (_j = iaCfg === null || iaCfg === void 0 ? void 0 : iaCfg.channels) === null || _j === void 0 ? void 0 : _j.internalAffairs;
                    let iaCategory;
                    if (isSnowflake(iaCatId)) {
                        iaCategory = ((_l = (_k = interaction.guild.channels.cache.get(iaCatId)) !== null && _k !== void 0 ? _k : (await interaction.guild.channels.fetch(iaCatId).catch(() => null))) !== null && _l !== void 0 ? _l : undefined);
                    }
                    // Fallback: find a category named "Internal Affairs"
                    if (!iaCategory) {
                        iaCategory = interaction.guild.channels.cache.find((c) => c.name.toLowerCase() === 'internal affairs' && c.type === discord_js_1.ChannelType.GuildCategory);
                    }
                    if (!iaCategory) {
                        await interaction.editReply((0, GenUtils_1.errorEmbed)('No Internal Affairs category configured. Set it in the NEST dashboard or create a category named "Internal Affairs".'));
                        return;
                    }
                    // Internal Reviewer role — resolve to actual Role object
                    const irRoleId = (_m = iaCfg === null || iaCfg === void 0 ? void 0 : iaCfg.roles) === null || _m === void 0 ? void 0 : _m.InternalReviewer;
                    const internalReviewer = isSnowflake(irRoleId)
                        ? ((_o = interaction.guild.roles.cache.get(irRoleId)) !== null && _o !== void 0 ? _o : interaction.guild.roles.cache.find(r => r.name === 'Internal Reviewer'))
                        : interaction.guild.roles.cache.find(r => r.name === 'Internal Reviewer');
                    const ticketNum = await nextTicketNum(interaction.guild);
                    // Build overwrites using actual objects
                    const iaOverwrites = baseOverwrites(interaction.guild, interaction.member);
                    if (internalReviewer)
                        iaOverwrites.push(roleOverwrite(internalReviewer));
                    const newChannel = await interaction.guild.channels.create({
                        name: `internal-affair-${ticketNum}`,
                        type: discord_js_1.ChannelType.GuildText,
                        permissionOverwrites: iaOverwrites,
                        reason: `Internal Affair opened by ${interaction.user.username}.`,
                        parent: iaCategory,
                    }).catch(async (err) => {
                        await interaction.editReply((0, GenUtils_1.errorEmbed)('Unable to create ticket channel! Please try again.'));
                        logging_1.Log.error(err);
                        return null;
                    });
                    if (!newChannel)
                        return;
                    if (!createTranscriptFiles(newChannel.id, interaction.user.id)) {
                        await interaction.editReply((0, GenUtils_1.errorEmbed)('Unable to create ticket transcript!'));
                        await newChannel.delete().catch(() => { });
                        return;
                    }
                    const iaTicketRow = new discord_js_1.ActionRowBuilder()
                        .addComponents(new discord_js_1.ButtonBuilder().setCustomId('close_ticket').setStyle(discord_js_1.ButtonStyle.Danger).setLabel('Close Ticket').setEmoji('✖'));
                    const iaEmbed = new discord_js_1.EmbedBuilder()
                        .setAuthor({ name: `${interaction.user.username}'s Internal Affair Report`, iconURL: interaction.user.displayAvatarURL() || undefined })
                        .setColor(0xf1c40f)
                        .setDescription('Thank you for taking the time to open an Internal Affair Report, where you can report staff misconduct or any other staff related grievances. '
                        + 'Please describe the following in detail so we can work on your case as fast as possible:\n\n'
                        + '- Which staff are you reporting?\n'
                        + '- What are you reporting them for?\n'
                        + '- What proof do you have regarding this report?\n'
                        + '- What would you hope is done about this matter?\n'
                        + '- Any other information?\n\n'
                        + 'All content in this report is as confidential as possible between you, internal reviewers, and server managers.')
                        .setTimestamp()
                        .setFooter({ text: 'Ticket transcripts are saved permanently and are viewable by non-internal reviewers.' });
                    await newChannel.send({ content: `<@${interaction.user.id}>`, embeds: [iaEmbed], components: [iaTicketRow] });
                    const newTicket = new Tickets_1.default({
                        guildID: interaction.guild.id,
                        creatorID: interaction.user.id,
                        users: [],
                        channelID: newChannel.id,
                        claimedID: 'None',
                        closeReason: 'None',
                        status: true,
                        autoClose: 0,
                    });
                    await newTicket.save().catch(async (err) => {
                        await interaction.editReply((0, GenUtils_1.errorEmbed)('Failed to create ticket file!'));
                        logging_1.Log.error(err);
                        await newChannel.delete().catch((e) => { logging_1.Log.error('Failed to delete ticket channel!\n\n' + e.stack); });
                    });
                    await interaction.editReply({ content: `Your internal affair report has been created. <#${newChannel.id}>` });
                    break;
                }
                /* ── Close ticket (shows reason modal) ── */
                case 'close_ticket': {
                    const findingTicket = await Tickets_1.default.findOne({ guildID: interaction.guild.id, channelID: (_p = interaction.channel) === null || _p === void 0 ? void 0 : _p.id });
                    if (!findingTicket)
                        return;
                    if (interaction.user.id !== findingTicket.creatorID) {
                        const asstModPos = (_r = (_q = interaction.member.roles.cache.find((r) => r.name.toLowerCase() === 'assistant moderator')) === null || _q === void 0 ? void 0 : _q.position) !== null && _r !== void 0 ? _r : 0;
                        const seniorMktPos = (_t = (_s = interaction.member.roles.cache.find((r) => r.name.toLowerCase() === 'senior marketplace moderator')) === null || _s === void 0 ? void 0 : _s.position) !== null && _t !== void 0 ? _t : 0;
                        const highestPos = interaction.member.roles.highest.position;
                        if (asstModPos > highestPos || seniorMktPos > highestPos) {
                            await interaction.reply({ flags: discord_js_1.MessageFlags.Ephemeral, ...(0, GenUtils_1.errorEmbed)('You must be the ticket creator to close the ticket!') });
                            return;
                        }
                    }
                    const modal = new discord_js_1.ModalBuilder().setCustomId('modal_close_reason').setTitle('Enter a Reason');
                    modal.addComponents(new discord_js_1.ActionRowBuilder().setComponents(new discord_js_1.TextInputBuilder()
                        .setCustomId('close_reason')
                        .setLabel('Reason')
                        .setPlaceholder('Ticket resolved.')
                        .setRequired(true)
                        .setMaxLength(250)
                        .setStyle(discord_js_1.TextInputStyle.Paragraph)));
                    await interaction.showModal(modal);
                    break;
                }
                /* ── Log transcript ── */
                case 'log_transcript': {
                    await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
                    const asstModPos = (_v = (_u = interaction.member.roles.cache.find((r) => r.name.toLowerCase() === 'assistant moderator')) === null || _u === void 0 ? void 0 : _u.position) !== null && _v !== void 0 ? _v : 0;
                    const seniorMktPos = (_x = (_w = interaction.member.roles.cache.find((r) => r.name.toLowerCase() === 'senior marketplace moderator')) === null || _w === void 0 ? void 0 : _w.position) !== null && _x !== void 0 ? _x : 0;
                    if (asstModPos > interaction.member.roles.highest.position || seniorMktPos > interaction.member.roles.highest.position) {
                        await interaction.editReply((0, GenUtils_1.errorEmbed)('You must be an Assistant Moderator to use this!'));
                        return;
                    }
                    const foundTicket = await Tickets_1.default.findOne({ guildID: interaction.guild.id, channelID: (_y = interaction.channel) === null || _y === void 0 ? void 0 : _y.id });
                    if (!foundTicket)
                        return;
                    await ((_z = interaction.channel) === null || _z === void 0 ? void 0 : _z.send({ content: 'Transcript and media being sent to the transcripts channel now.' }));
                    transcriptString((_0 = interaction.channel) === null || _0 === void 0 ? void 0 : _0.name, (_1 = interaction.channel) === null || _1 === void 0 ? void 0 : _1.id, interaction, interaction.user.id);
                    const logRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId('log_transcript').setStyle(discord_js_1.ButtonStyle.Secondary).setLabel('Log Transcript').setDisabled(true).setEmoji('📰'), new discord_js_1.ButtonBuilder().setCustomId('delete_ticket').setStyle(discord_js_1.ButtonStyle.Danger).setLabel('Delete Ticket').setEmoji('🗑'));
                    await interaction.message.edit({ components: [logRow] });
                    await interaction.editReply({ content: 'Transcript logged.' });
                    break;
                }
                /* ── Delete ticket ── */
                case 'delete_ticket': {
                    await interaction.deferReply({});
                    const asstModPos = (_3 = (_2 = interaction.member.roles.cache.find((r) => r.name.toLowerCase() === 'assistant moderator')) === null || _2 === void 0 ? void 0 : _2.position) !== null && _3 !== void 0 ? _3 : 0;
                    const seniorMktPos = (_5 = (_4 = interaction.member.roles.cache.find((r) => r.name.toLowerCase() === 'senior marketplace moderator')) === null || _4 === void 0 ? void 0 : _4.position) !== null && _5 !== void 0 ? _5 : 0;
                    if (asstModPos > interaction.member.roles.highest.position || seniorMktPos > interaction.member.roles.highest.position) {
                        await interaction.editReply((0, GenUtils_1.errorEmbed)('You must be an Assistant Moderator to use this!'));
                        return;
                    }
                    await Tickets_1.default.findOneAndDelete({ guildID: interaction.guild.id, channelID: (_6 = interaction.channel) === null || _6 === void 0 ? void 0 : _6.id });
                    const deleteRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId('log_transcript').setStyle(discord_js_1.ButtonStyle.Secondary).setLabel('Log Transcript').setDisabled(true).setEmoji('📰'), new discord_js_1.ButtonBuilder().setCustomId('delete_ticket').setStyle(discord_js_1.ButtonStyle.Danger).setLabel('Delete Ticket').setDisabled(true).setEmoji('🗑'));
                    await interaction.message.edit({ components: [deleteRow] });
                    await interaction.editReply({ content: 'Ticket file deleted, deleting channel soon.' });
                    setTimeout(async () => {
                        var _a, _b;
                        (0, fs_1.rmSync)(transcriptDir((_a = interaction.channel) === null || _a === void 0 ? void 0 : _a.id), { recursive: true, force: true });
                        await ((_b = interaction.channel) === null || _b === void 0 ? void 0 : _b.delete('Ticket closed'));
                    }, 10000);
                    break;
                }
                /* ── Request close (by ticket creator) ── */
                case 'req_close': {
                    await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
                    const reqTicket = await Tickets_1.default.findOne({ guildID: interaction.guild.id, channelID: (_7 = interaction.channel) === null || _7 === void 0 ? void 0 : _7.id, status: true });
                    if (!reqTicket) {
                        await interaction.editReply((0, GenUtils_1.errorEmbed)('Ticket already closed.'));
                        return;
                    }
                    if (reqTicket.creatorID !== interaction.user.id) {
                        await interaction.editReply({ content: 'This is not your button!' });
                        return;
                    }
                    await reqTicket.updateOne({ status: false });
                    // Disable the req_close / req_keep_open buttons on the original message
                    const disabledRow = new discord_js_1.ActionRowBuilder().addComponents(discord_js_1.ButtonBuilder.from(interaction.message.components[0].components[0]).setDisabled(true), discord_js_1.ButtonBuilder.from(interaction.message.components[0].components[1]).setDisabled(true));
                    await interaction.message.edit({ components: [disabledRow] });
                    const closedRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId('close_ticket').setStyle(discord_js_1.ButtonStyle.Danger).setLabel('Close Ticket').setDisabled(true).setEmoji('✖'), new discord_js_1.ButtonBuilder().setCustomId('log_transcript').setStyle(discord_js_1.ButtonStyle.Secondary).setLabel('Log Transcript').setEmoji('📰'));
                    const closedEmbed = new discord_js_1.EmbedBuilder()
                        .setAuthor({ name: `Ticket Closed - ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() || undefined })
                        .setDescription(`Ticket has been closed. The ticket creator, and any added users have been removed and can no longer view the ticket.\n`
                        + `**Reason:** ${reqTicket.closeReason}\n\n`
                        + 'Click `Log Transcript` to log the transcript.')
                        .setColor('Green')
                        .setTimestamp();
                    await ((_8 = interaction.channel) === null || _8 === void 0 ? void 0 : _8.send({ embeds: [closedEmbed], components: [closedRow] }));
                    const dmEmbed = new discord_js_1.EmbedBuilder()
                        .setAuthor({ name: 'Ticket Closed', iconURL: interaction.guild.iconURL() || undefined })
                        .setDescription(`Ticket \`#${(_9 = interaction.channel) === null || _9 === void 0 ? void 0 : _9.name.split('-')[1]}\` has been closed!\n\n`
                        + `${config_1.config.bulletpointEmoji} **Reason:** ${reqTicket.closeReason}`)
                        .setColor('Green')
                        .setTimestamp();
                    await ((_10 = interaction.channel) === null || _10 === void 0 ? void 0 : _10.edit({ name: `closed-${interaction.channel.name.split('-')[1]}` }).catch(async (err) => {
                        (0, GenUtils_1.handleError)(err);
                        await interaction.editReply((0, GenUtils_1.errorEmbed)(`An error occurred!\n\`${err.name}\``));
                    }));
                    // Remove creator access — pass explicit type so no cache lookup needed
                    await interaction.channel.permissionOverwrites.edit(reqTicket.creatorID, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false }, { type: discord_js_1.OverwriteType.Member });
                    const creator = interaction.client.users.cache.get(reqTicket.creatorID);
                    if (creator)
                        creator.send({ embeds: [dmEmbed] }).catch(() => { });
                    for (const userId of reqTicket.users) {
                        await interaction.channel.permissionOverwrites.edit(userId, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false }, { type: discord_js_1.OverwriteType.Member });
                        const user = interaction.client.users.cache.get(userId);
                        if (user)
                            await user.send({ embeds: [dmEmbed] }).catch(() => { });
                    }
                    await interaction.editReply({ content: 'Ticket closed.' });
                    break;
                }
                /* ── Request keep open (by ticket creator) ── */
                case 'req_keep_open': {
                    await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
                    const reqTicket2 = await Tickets_1.default.findOne({ guildID: interaction.guild.id, channelID: (_11 = interaction.channel) === null || _11 === void 0 ? void 0 : _11.id, status: true });
                    if (!reqTicket2) {
                        await interaction.editReply((0, GenUtils_1.errorEmbed)('Ticket already closed.'));
                        return;
                    }
                    if (reqTicket2.creatorID !== interaction.user.id) {
                        await interaction.editReply({ content: 'This is not your button!' });
                        return;
                    }
                    await reqTicket2.updateOne({ closeReason: 'None' });
                    const keepOpenRow = new discord_js_1.ActionRowBuilder().addComponents(discord_js_1.ButtonBuilder.from(interaction.message.components[0].components[0]).setDisabled(true), discord_js_1.ButtonBuilder.from(interaction.message.components[0].components[1]).setDisabled(true));
                    await interaction.message.edit({ components: [keepOpenRow] });
                    await ((_12 = interaction.channel) === null || _12 === void 0 ? void 0 : _12.send({ content: 'Close request denied!' }).catch(() => { }));
                    await interaction.editReply({ content: 'Cancelled close request.' });
                    break;
                }
            }
            /* ── Update ticket status message after every button ── */
            try {
                const ticketStatusDoc = await TicketStatus_1.default.findOne({ guildId: interaction.guildId });
                const status = await (0, TicketStatusUpdate_1.updateTicketStatus)();
                if (ticketStatusDoc && ticketStatusDoc.ticketStatus !== status) {
                    const statusChannel = await interaction.guild.channels.fetch(ticketStatusDoc.channelId).catch(() => null);
                    if (statusChannel) {
                        let prevMsg = null;
                        try {
                            prevMsg = await statusChannel.messages.fetch(ticketStatusDoc.messageId);
                        }
                        catch (_18) { }
                        await (prevMsg === null || prevMsg === void 0 ? void 0 : prevMsg.delete());
                        const tEmbed = await (0, TicketStatusUpdate_1.resolveTicketStatusEmbed)(status);
                        const newMsg = await statusChannel.send({ embeds: [tEmbed] });
                        await ticketStatusDoc.deleteOne();
                        await TicketStatus_1.default.create({
                            guildId: interaction.guildId,
                            channelId: newMsg.channelId,
                            messageId: newMsg.id,
                            ticketStatus: status,
                        });
                    }
                }
            }
            catch (err) {
                logging_1.Log.error(`Failed to update ticket status: ${err}`);
            }
            /* ── Modal interactions ── */
        }
        else if (interaction.isModalSubmit()) {
            if (interaction.customId !== 'modal_close_reason')
                return;
            await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
            const foundTicket = await Tickets_1.default.findOne({ guildID: interaction.guild.id, channelID: (_13 = interaction.channel) === null || _13 === void 0 ? void 0 : _13.id, status: true });
            if (!foundTicket) {
                await interaction.editReply((0, GenUtils_1.errorEmbed)('Ticket already closed.'));
                return;
            }
            const reason = interaction.fields.getTextInputValue('close_reason') || 'No reason provided.';
            await foundTicket.updateOne({ closeReason: reason, status: false });
            // Disable close button on original message
            const disabledCloseRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId('close_ticket').setStyle(discord_js_1.ButtonStyle.Danger).setLabel('Close Ticket').setDisabled(true).setEmoji('✖'));
            await ((_14 = interaction.message) === null || _14 === void 0 ? void 0 : _14.edit({ components: [disabledCloseRow] }));
            const logRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId('log_transcript').setStyle(discord_js_1.ButtonStyle.Secondary).setLabel('Log Transcript').setEmoji('📰'));
            const closedEmbed = new discord_js_1.EmbedBuilder()
                .setAuthor({ name: `Ticket Closed - ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() || undefined })
                .setDescription(`Ticket has been closed. The ticket creator, and any added users have been removed and can no longer view the ticket.\n`
                + `**Reason:** ${reason}\n\n`
                + 'Click `Log Transcript` to log the transcript.')
                .setColor('Green')
                .setTimestamp();
            await ((_15 = interaction.channel) === null || _15 === void 0 ? void 0 : _15.send({ embeds: [closedEmbed], components: [logRow] }));
            const dmEmbed = new discord_js_1.EmbedBuilder()
                .setAuthor({ name: 'Ticket Closed', iconURL: interaction.guild.iconURL() || undefined })
                .setDescription(`Ticket \`#${(_16 = interaction.channel) === null || _16 === void 0 ? void 0 : _16.name.split('-')[1]}\` has been closed!\n\n`
                + `${config_1.config.bulletpointEmoji} **Reason:** ${reason}`)
                .setColor('Green')
                .setTimestamp();
            await ((_17 = interaction.channel) === null || _17 === void 0 ? void 0 : _17.edit({ name: `closed-${interaction.channel.name.split('-')[1]}` }).catch(async (err) => {
                (0, GenUtils_1.handleError)(err);
                await interaction.editReply((0, GenUtils_1.errorEmbed)(`An error occurred!\n\`${err.name}\``));
            }));
            // Remove creator access — pass explicit type
            await interaction.channel.permissionOverwrites.edit(foundTicket.creatorID, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false }, { type: discord_js_1.OverwriteType.Member });
            const creator = interaction.client.users.cache.get(foundTicket.creatorID);
            if (creator)
                creator.send({ embeds: [dmEmbed] }).catch(() => { });
            for (const userId of foundTicket.users) {
                await interaction.channel.permissionOverwrites.edit(userId, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false }, { type: discord_js_1.OverwriteType.Member });
                const user = interaction.client.users.cache.get(userId);
                if (user)
                    await user.send({ embeds: [dmEmbed] }).catch(() => { });
            }
            await interaction.editReply({ content: 'Ticket closed.' });
        }
    },
};
/* ════════════════════════════════════════════════════════════════
   Helpers
════════════════════════════════════════════════════════════════ */
async function getTicketTranscriptByID(id) {
    try {
        const dir = transcriptDir(id);
        const media = (0, fs_1.readdirSync)(path_1.default.join(dir, 'media'));
        const md = (0, fs_1.readFileSync)(path_1.default.join(dir, 'ticket_transcript.md'));
        const txt = (0, fs_1.readFileSync)(path_1.default.join(dir, 'ticket_transcript.txt'));
        return { media, md, txt };
    }
    catch (err) {
        logging_1.Log.error(err);
        (0, GenUtils_1.handleError)(err);
    }
    return null;
}
async function transcriptString(ticketname, ticket_id, interaction, closerID) {
    var _a, _b, _c, _d, _e, _f, _g;
    const scriptsChannel = interaction.guild.channels.cache.find(c => c.name.toLowerCase() === 'transcripts');
    if (!scriptsChannel)
        return;
    const foundTicket = await Tickets_1.default.findOne({ guildID: (_a = interaction.guild) === null || _a === void 0 ? void 0 : _a.id, channelID: ticket_id });
    if (!foundTicket)
        return;
    const user = await interaction.client.users.fetch(foundTicket.creatorID);
    const results = await getTicketTranscriptByID(ticket_id);
    const transcriptEmbed = new discord_js_1.EmbedBuilder()
        .setAuthor({ name: `Ticket #${(_b = interaction.channel) === null || _b === void 0 ? void 0 : _b.name.split('-')[1]} Transcript`, iconURL: ((_c = interaction.guild) === null || _c === void 0 ? void 0 : _c.iconURL()) || undefined })
        .setThumbnail(user.displayAvatarURL() || null)
        .setDescription(`${config_1.config.bulletpointEmoji} **Creator:** <@${foundTicket.creatorID}>\n`
        + `${config_1.config.bulletpointEmoji} **Closer:** <@${closerID}>\n`
        + `${config_1.config.bulletpointEmoji} **Reason:** ${foundTicket.closeReason}`)
        .setColor('Green')
        .setTimestamp();
    if (!results) {
        // Fallback: no transcript session found — fetch recent messages
        const fetched = await ((_d = interaction.channel) === null || _d === void 0 ? void 0 : _d.messages.fetch({ limit: 100 }));
        if (!fetched)
            return;
        let s = '';
        for (const msg of Array.from(fetched.values())) {
            s += `From ${msg.author.tag} (${msg.author.id})\n    ${(_e = msg.content) !== null && _e !== void 0 ? _e : ''}\n`;
        }
        const buffer = Buffer.from((0, lodash_1.escapeRegExp)(s), 'utf-8');
        const msg = await scriptsChannel.send({ embeds: [transcriptEmbed] });
        const thread = await msg.startThread({
            name: `Ticket #${(_f = interaction.channel) === null || _f === void 0 ? void 0 : _f.name.split('-')[1]}`,
            autoArchiveDuration: 60,
            reason: 'Transcript',
        });
        await thread.send({ files: [{ attachment: buffer, name: ticketname + '.txt' }] });
        return;
    }
    const msg = await scriptsChannel.send({
        embeds: [transcriptEmbed],
        files: [
            { attachment: results.md, name: ticketname + '.md' },
            { attachment: results.txt, name: ticketname + '.txt' },
        ],
    });
    const thread = await msg.startThread({
        name: `Ticket-${(_g = interaction.channel) === null || _g === void 0 ? void 0 : _g.name.split('-')[1]} Media`,
        autoArchiveDuration: discord_js_1.ThreadAutoArchiveDuration.OneDay,
        reason: 'Ticket Media',
    });
    for (const mediaFile of results.media) {
        await thread.send({
            content: mediaFile,
            files: [path_1.default.join(transcriptDir(ticket_id), 'media', mediaFile)],
        });
    }
}
