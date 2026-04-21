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
const SkipTickets = [
    1488,
    69,
    420,
    69420,
    67,
    6767
];
exports.default = {
    name: discord_js_1.Events.InteractionCreate,
    once: false,
    async execute(_, interaction) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
        if (!interaction.inCachedGuild())
            return;
        if (interaction.isButton()) {
            const buttonID = interaction.customId;
            switch (buttonID) {
                case "open_internal_affair": {
                    const internalAffairEmbed = new discord_js_1.EmbedBuilder()
                        .setTitle('New Internal Affair Report')
                        .setColor("Red")
                        .setDescription(`This feature will open a ticket, used to report staff misconduct or staff grievances. This ticket will only be able to be viewed by Internal Reviewers.`
                        + `\n\n**Click "Open Ticket" below to acknowledge this feature's intended usage**, and to open an Internal Affair Ticket.`);
                    const internalAffairButtons = new discord_js_1.ActionRowBuilder()
                        .addComponents(new discord_js_1.ButtonBuilder()
                        .setLabel('Nevermind')
                        .setCustomId('internal-affair-nevermind')
                        .setStyle(discord_js_1.ButtonStyle.Danger), new discord_js_1.ButtonBuilder()
                        .setLabel('Open Ticket')
                        .setCustomId('internal-affair-open-ticket')
                        .setStyle(discord_js_1.ButtonStyle.Primary));
                    await interaction.reply({
                        ephemeral: true,
                        embeds: [
                            internalAffairEmbed
                        ],
                        components: [
                            internalAffairButtons
                        ]
                    });
                    break;
                }
                case "internal-affair-nevermind": {
                    await interaction.update({
                        embeds: [],
                        components: [],
                        content: `Ok, I've cancelled your request.`
                    });
                    break;
                }
                case "internal-affair-open-ticket": {
                    await interaction.update({
                        embeds: [],
                        components: [],
                        content: `Opening a ticket...`
                    });
                    const ticketsDisabled = await FastFlag_1.default.findOne({
                        refName: 'DisableTicketOpening',
                        enabled: true
                    });
                    if (ticketsDisabled) {
                        await interaction.editReply({
                            content: 'Tickets are currently disabled. Please try again later.'
                        });
                        return;
                    }
                    if (interaction.member.roles.cache.find((r) => r.name.toLowerCase() === "ticket banned")) {
                        await interaction.editReply((0, GenUtils_1.errorEmbed)("You are banned from opening tickets."));
                        return;
                    }
                    const findTicket = await Tickets_1.default.findOne({
                        guildID: interaction.guild.id,
                        creatorID: interaction.user.id,
                        status: true,
                    });
                    if (findTicket) {
                        const ticketChannel = await interaction.guild.channels.fetch(findTicket.channelID).catch((err) => { });
                        console.log(ticketChannel);
                        if (ticketChannel) {
                            await interaction.editReply((0, GenUtils_1.errorEmbed)("You already have a ticket open."));
                            return;
                        }
                        else {
                            await findTicket.deleteOne();
                        }
                    }
                    const category = interaction.guild.channels.cache.find(c => c.name.toLowerCase() == "internal affairs" && c.type === discord_js_1.ChannelType.GuildCategory);
                    if (!category) {
                        await interaction.editReply((0, GenUtils_1.errorEmbed)("No affair category found. Please contact an administrator!"));
                        return;
                    }
                    const internalReviewer = interaction.guild.roles.cache.find(r => r.name === "Internal Reviewer");
                    let ticketNum = await (0, GenUtils_1.incrimentTicket)(interaction.guild);
                    if (SkipTickets.find(t => t === ticketNum)) {
                        logging_1.Log.debug(`Ticket #${ticketNum} has been skipped.`);
                        ticketNum = await (0, GenUtils_1.incrimentTicket)(interaction.guild);
                    }
                    const newChannel = await interaction.guild.channels.create({
                        name: `internal-affair-${ticketNum}`,
                        type: discord_js_1.ChannelType.GuildText,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.id,
                                deny: [discord_js_1.PermissionsBitField.Flags.ViewChannel, discord_js_1.PermissionsBitField.Flags.SendMessages, discord_js_1.PermissionsBitField.Flags.ReadMessageHistory]
                            },
                            {
                                id: interaction.user.id,
                                allow: [discord_js_1.PermissionsBitField.Flags.ViewChannel, discord_js_1.PermissionsBitField.Flags.SendMessages, discord_js_1.PermissionsBitField.Flags.ReadMessageHistory, discord_js_1.PermissionsBitField.Flags.AttachFiles]
                            },
                            {
                                id: internalReviewer.id,
                                allow: [discord_js_1.PermissionsBitField.Flags.ViewChannel, discord_js_1.PermissionsBitField.Flags.SendMessages, discord_js_1.PermissionsBitField.Flags.ReadMessageHistory]
                            }
                        ],
                        reason: `Ticket opened by ${interaction.user.username}.`,
                        parent: category,
                    }).catch(async (err) => {
                        await interaction.editReply((0, GenUtils_1.errorEmbed)("Unable to create ticket channel! Please try again."));
                        logging_1.Log.error(err);
                        return;
                    });
                    if (!newChannel) {
                        await interaction.editReply((0, GenUtils_1.errorEmbed)("Unable to create ticket channel! Please try again."));
                        return;
                    }
                    // const transcriptPath1 = path.join(__dirname, "../..", "transcripts");
                    // if (existsSync(transcriptPath1)) {
                    // 	await interaction.editReply(errorEmbed(`I had an error with the transcripts! Please contact an administrator with a screenshot of this message. \`T-${ticketNum}\``));
                    // 	return;
                    // }
                    const transcriptPath = path_1.default.join(__dirname, "../..", "transcripts", `${newChannel.id}`);
                    try {
                        (0, fs_1.mkdirSync)(transcriptPath);
                    }
                    catch (err) {
                        interaction.editReply((0, GenUtils_1.errorEmbed)("Unable to create ticket transcript!"));
                        logging_1.Log.error(err);
                        newChannel.delete().catch((err) => {
                            logging_1.Log.error(err);
                        });
                        return;
                    }
                    const meta = {
                        creator: interaction.user.id,
                        ticketID: newChannel.id,
                        date: new Date()
                    };
                    try {
                        (0, fs_1.writeFileSync)(`${transcriptPath}/ticket_meta.json`, JSON.stringify(meta));
                        (0, fs_1.writeFileSync)(`${transcriptPath}/ticket_transcript.md`, "");
                        (0, fs_1.writeFileSync)(`${transcriptPath}/ticket_transcript.txt`, "");
                        (0, fs_1.mkdirSync)(path_1.default.join(__dirname, "../..", "transcripts", `${newChannel.id}`, "media"));
                    }
                    catch (err) {
                        interaction.editReply((0, GenUtils_1.errorEmbed)("Unable to create ticket transcript!"));
                        logging_1.Log.error(err);
                        (0, fs_1.rmSync)(path_1.default.join(__dirname, "../..", "transcripts", `${newChannel.id}`), { recursive: true, force: true });
                        newChannel.delete().catch(() => { });
                        return;
                    }
                    const ticketRow = new discord_js_1.ActionRowBuilder()
                        .addComponents(new discord_js_1.ButtonBuilder()
                        .setCustomId("close_ticket")
                        .setStyle(discord_js_1.ButtonStyle.Danger)
                        .setLabel("Close Ticket")
                        .setEmoji("✖"));
                    const ticketEmbed = new discord_js_1.EmbedBuilder()
                        .setAuthor({ name: `${interaction.user.username}'s Internal Affair Report`, iconURL: interaction.user.displayAvatarURL() || undefined })
                        .setColor(0xf1c40f)
                        .setDescription(`Thank you for taking the time to open an Internal Affair Report, where you can report staff misconduct or any other staff related grievances. Please describe the following in detail so we can work on your case as fast as possible:\n\n- Which staff are you reporting?\n- What are you reporting them for?\n- What proof do you have regarding this report?\n- What would you hope is done about this matter?\n- Any other information?\n\nAll content in this report is as confidential as possible between you, internal reviewers, and server managers.`)
                        .setTimestamp()
                        .setFooter({ text: "Ticket transcripts are saved permanently and are viewable by non-internal reviewers." });
                    newChannel.send({ content: `<@${interaction.user.id}> <@&1203544976030437397>`, embeds: [ticketEmbed], components: [ticketRow] });
                    const newTicket = new Tickets_1.default({
                        guildID: interaction.guild.id,
                        creatorID: interaction.user.id,
                        users: [],
                        channelID: newChannel.id,
                        claimedID: "None",
                        closeReason: "None",
                        status: true,
                        autoClose: 0,
                    });
                    newTicket.save().catch(async (err) => {
                        await interaction.editReply((0, GenUtils_1.errorEmbed)("Failed to create ticket file!"));
                        logging_1.Log.error(err);
                        newChannel.delete().catch((error) => { logging_1.Log.error("Failed to delete ticket channel!\n\n" + error.stack); });
                        return;
                    });
                    await interaction.editReply({ content: `Your internal affair report has been created. <#${newChannel.id}>` });
                    break;
                }
                case "open_ticket":
                    {
                        await interaction.deferReply({ ephemeral: true });
                        const ticketsDisabled = await FastFlag_1.default.findOne({
                            refName: 'DisableTicketOpening',
                            enabled: true
                        });
                        if (ticketsDisabled) {
                            await interaction.editReply({
                                content: 'Tickets are currently disabled. Please try again later.'
                            });
                            return;
                        }
                        if (interaction.member.roles.cache.find((r) => r.name.toLowerCase() === "ticket banned")) {
                            await interaction.editReply((0, GenUtils_1.errorEmbed)("You are banned from opening tickets."));
                            return;
                        }
                        const findTicket = await Tickets_1.default.findOne({
                            guildID: interaction.guild.id,
                            creatorID: interaction.user.id,
                            status: true,
                        });
                        if (findTicket) {
                            const ticketChannel = interaction.guild.channels.cache.get(findTicket.channelID);
                            if (ticketChannel) {
                                await interaction.editReply((0, GenUtils_1.errorEmbed)("You already have a ticket open."));
                                return;
                            }
                            else {
                                await findTicket.deleteOne();
                            }
                        }
                        const category = interaction.guild.channels.cache.find(c => c.name.toLowerCase() == "tickets" && c.type === discord_js_1.ChannelType.GuildCategory);
                        if (!category) {
                            await interaction.editReply((0, GenUtils_1.errorEmbed)("No ticket category found. Please contact an administrator!"));
                            return;
                        }
                        const juniorMod = interaction.guild.roles.cache.find(r => r.name === "Trial Community Moderator");
                        const srMarketMod = interaction.guild.roles.cache.find(r => r.name === "Senior Marketplace Moderator");
                        let ticketNum = await (0, GenUtils_1.incrimentTicket)(interaction.guild);
                        if (SkipTickets.find(t => { t === ticketNum; })) {
                            logging_1.Log.debug(`Ticket #${ticketNum} has been skipped.`);
                            ticketNum = await (0, GenUtils_1.incrimentTicket)(interaction.guild);
                        }
                        const newChannel = await interaction.guild.channels.create({
                            name: `ticket-${ticketNum}`,
                            type: discord_js_1.ChannelType.GuildText,
                            permissionOverwrites: [
                                {
                                    id: interaction.guild.id,
                                    deny: [discord_js_1.PermissionsBitField.Flags.ViewChannel, discord_js_1.PermissionsBitField.Flags.SendMessages, discord_js_1.PermissionsBitField.Flags.ReadMessageHistory]
                                },
                                {
                                    id: interaction.user.id,
                                    allow: [discord_js_1.PermissionsBitField.Flags.ViewChannel, discord_js_1.PermissionsBitField.Flags.SendMessages, discord_js_1.PermissionsBitField.Flags.ReadMessageHistory, discord_js_1.PermissionsBitField.Flags.AttachFiles]
                                },
                                {
                                    id: "1203545488008155136",
                                    allow: [discord_js_1.PermissionsBitField.Flags.ViewChannel, discord_js_1.PermissionsBitField.Flags.SendMessages, discord_js_1.PermissionsBitField.Flags.ReadMessageHistory]
                                },
                            ],
                            reason: `Ticket opened by ${interaction.user.username}.`,
                            parent: category,
                        }).catch(async (err) => {
                            await interaction.editReply((0, GenUtils_1.errorEmbed)("Unable to create ticket channel! Please try again."));
                            logging_1.Log.error(err);
                            return;
                        });
                        if (!newChannel) {
                            await interaction.editReply((0, GenUtils_1.errorEmbed)("Unable to create ticket channel! Please try again."));
                            return;
                        }
                        // const transcriptPath1 = path.join(__dirname, "../..", "transcripts");
                        // if (existsSync(transcriptPath1)) {
                        // 	await interaction.editReply(errorEmbed(`I had an error with the transcripts! Please contact an administrator with a screenshot of this message. \`T-${ticketNum}\``));
                        // 	return;
                        // }
                        const transcriptPath = path_1.default.join(__dirname, "../..", "transcripts", `${newChannel.id}`);
                        try {
                            (0, fs_1.mkdirSync)(transcriptPath);
                        }
                        catch (err) {
                            interaction.editReply((0, GenUtils_1.errorEmbed)("Unable to create ticket transcript!"));
                            logging_1.Log.error(err);
                            newChannel.delete().catch(() => { });
                            return;
                        }
                        const meta = {
                            creator: interaction.user.id,
                            ticketID: newChannel.id,
                            date: new Date()
                        };
                        try {
                            (0, fs_1.writeFileSync)(`${transcriptPath}/ticket_meta.json`, JSON.stringify(meta));
                            (0, fs_1.writeFileSync)(`${transcriptPath}/ticket_transcript.md`, "");
                            (0, fs_1.writeFileSync)(`${transcriptPath}/ticket_transcript.txt`, "");
                            (0, fs_1.mkdirSync)(path_1.default.join(__dirname, "../..", "transcripts", `${newChannel.id}`, "media"));
                        }
                        catch (err) {
                            interaction.editReply((0, GenUtils_1.errorEmbed)("Unable to create ticket transcript!"));
                            logging_1.Log.error(err);
                            (0, fs_1.rmSync)(path_1.default.join(__dirname, "../..", "transcripts", `${newChannel.id}`), { recursive: true, force: true });
                            newChannel.delete().catch(() => { });
                            return;
                        }
                        const ticketRow = new discord_js_1.ActionRowBuilder()
                            .addComponents(new discord_js_1.ButtonBuilder()
                            .setCustomId("close_ticket")
                            .setStyle(discord_js_1.ButtonStyle.Danger)
                            .setLabel("Close Ticket")
                            .setEmoji("✖"));
                        const ticketEmbed = new discord_js_1.EmbedBuilder()
                            .setAuthor({ name: `${interaction.user.username}'s Ticket`, iconURL: interaction.user.displayAvatarURL() || undefined })
                            .setColor("Green")
                            .setDescription(`Please describe why you opened this ticket, a staff member will be with you shortly.
								
								If you opened this ticket by mistake, leave a short response and close the ticket.`)
                            .setTimestamp()
                            .setFooter({ text: "Ticket transcripts are saved permanently." });
                        newChannel.send({ content: `<@${interaction.user.id}> <@&1050243383999864852> https://nohello.net`, embeds: [ticketEmbed], components: [ticketRow] });
                        const newTicket = new Tickets_1.default({
                            guildID: interaction.guild.id,
                            creatorID: interaction.user.id,
                            users: [],
                            channelID: newChannel.id,
                            claimedID: "None",
                            closeReason: "None",
                            status: true,
                            autoClose: 0,
                        });
                        newTicket.save().catch(async (err) => {
                            await interaction.editReply((0, GenUtils_1.errorEmbed)("Failed to create ticket file!"));
                            newChannel.delete().catch((error) => { logging_1.Log.error("Failed to delete ticket channel!\n\n" + error.stack); });
                            return;
                        });
                        await interaction.editReply({ content: `Your ticket has been created. <#${newChannel.id}>` });
                        break;
                    }
                case "close_ticket":
                    const findingTicket = await Tickets_1.default.findOne({
                        guildID: interaction.guild.id,
                        channelID: (_a = interaction.channel) === null || _a === void 0 ? void 0 : _a.id
                    });
                    if (!findingTicket)
                        return;
                    if (interaction.user.id !== findingTicket.creatorID) {
                        if (((_b = interaction.member.roles.cache.find((r) => r.name.toLowerCase() === "assistant moderator")) === null || _b === void 0 ? void 0 : _b.position) > interaction.member.roles.highest.position || ((_c = interaction.member.roles.cache.find((r) => r.name.toLowerCase() === "senior marketplace moderator")) === null || _c === void 0 ? void 0 : _c.position) > interaction.member.roles.highest.position) {
                            interaction.editReply((0, GenUtils_1.errorEmbed)("You must be the ticket creator to close the ticket!"));
                            return;
                        }
                    }
                    const postForm = new discord_js_1.ModalBuilder()
                        .setCustomId("modal_close_reason")
                        .setTitle("Enter a Reason");
                    const postInputs = [
                        new discord_js_1.TextInputBuilder()
                            .setCustomId('close_reason')
                            .setLabel("Reason")
                            .setPlaceholder("Ticket resolved.")
                            .setRequired(true)
                            .setMaxLength(250)
                            .setStyle(discord_js_1.TextInputStyle.Paragraph),
                    ];
                    for (const input of postInputs)
                        postForm.addComponents(new discord_js_1.ActionRowBuilder().setComponents(input));
                    await interaction.showModal(postForm);
                    break;
                case "log_transcript":
                    await interaction.deferReply({ ephemeral: true });
                    if (((_d = interaction.member.roles.cache.find((r) => r.name.toLowerCase() === "assistant moderator")) === null || _d === void 0 ? void 0 : _d.position) > interaction.member.roles.highest.position || ((_e = interaction.member.roles.cache.find((r) => r.name.toLowerCase() === "senior marketplace moderator")) === null || _e === void 0 ? void 0 : _e.position) > interaction.member.roles.highest.position) {
                        interaction.editReply((0, GenUtils_1.errorEmbed)("You must be an Assistant Moderator to use this!"));
                        return;
                    }
                    const foundTicket = await Tickets_1.default.findOne({
                        guildID: interaction.guild.id,
                        channelID: (_f = interaction.channel) === null || _f === void 0 ? void 0 : _f.id
                    });
                    if (!foundTicket)
                        return;
                    (_g = interaction.channel) === null || _g === void 0 ? void 0 : _g.send({ content: `Transcript and media being send to the transcripts channel now.` });
                    transcriptString((_h = interaction.channel) === null || _h === void 0 ? void 0 : _h.name, (_j = interaction.channel) === null || _j === void 0 ? void 0 : _j.id, interaction, interaction.user.id);
                    const ticketRow2 = new discord_js_1.ActionRowBuilder()
                        .addComponents(new discord_js_1.ButtonBuilder()
                        .setCustomId("log_transcript")
                        .setStyle(discord_js_1.ButtonStyle.Secondary)
                        .setLabel("Log Transcript")
                        .setDisabled(true)
                        .setEmoji("📰"), new discord_js_1.ButtonBuilder()
                        .setCustomId("delete_ticket")
                        .setStyle(discord_js_1.ButtonStyle.Danger)
                        .setLabel("Delete Ticket")
                        .setEmoji("🗑"));
                    await interaction.message.edit({ components: [ticketRow2] });
                    interaction.editReply({ content: "Transcript logged." });
                    break;
                case "delete_ticket":
                    await interaction.deferReply({});
                    if (((_k = interaction.member.roles.cache.find((r) => r.name.toLowerCase() === "assistant moderator")) === null || _k === void 0 ? void 0 : _k.position) > interaction.member.roles.highest.position || ((_l = interaction.member.roles.cache.find((r) => r.name.toLowerCase() === "senior marketplace moderator")) === null || _l === void 0 ? void 0 : _l.position) > interaction.member.roles.highest.position) {
                        interaction.editReply((0, GenUtils_1.errorEmbed)("You must be an Assistant Moderator to use this!"));
                        return;
                    }
                    await Tickets_1.default.findOneAndDelete({
                        guildID: interaction.guild.id,
                        channelID: (_m = interaction.channel) === null || _m === void 0 ? void 0 : _m.id
                    });
                    const ticketRow3 = new discord_js_1.ActionRowBuilder()
                        .addComponents(new discord_js_1.ButtonBuilder()
                        .setCustomId("log_transcript")
                        .setStyle(discord_js_1.ButtonStyle.Secondary)
                        .setLabel("Log Transcript")
                        .setDisabled(true)
                        .setEmoji("📰"), new discord_js_1.ButtonBuilder()
                        .setCustomId("delete_ticket")
                        .setStyle(discord_js_1.ButtonStyle.Danger)
                        .setLabel("Delete Ticket")
                        .setDisabled(true)
                        .setEmoji("🗑"));
                    await interaction.message.edit({ components: [ticketRow3] });
                    await interaction.editReply({ content: "Ticket file deleted, deleting channel soon." });
                    setTimeout(async () => {
                        var _a, _b;
                        (0, fs_1.rmSync)(path_1.default.join(__dirname, "../..", "transcripts", `${(_a = interaction.channel) === null || _a === void 0 ? void 0 : _a.id}`), { recursive: true, force: true });
                        await ((_b = interaction.channel) === null || _b === void 0 ? void 0 : _b.delete("Ticket closed"));
                    }, 10000);
                    break;
                case "req_close":
                    await interaction.deferReply({ ephemeral: true });
                    const reqTicket = await Tickets_1.default.findOne({
                        guildID: interaction.guild.id,
                        channelID: (_o = interaction.channel) === null || _o === void 0 ? void 0 : _o.id,
                        status: true
                    });
                    if (!reqTicket) {
                        interaction.editReply((0, GenUtils_1.errorEmbed)("Ticket already closed."));
                        return;
                    }
                    if (reqTicket.creatorID !== interaction.user.id) {
                        interaction.editReply({ content: "This is not your button!" });
                        return;
                    }
                    await reqTicket.updateOne({
                        status: false
                    });
                    const row = new discord_js_1.ActionRowBuilder()
                        .addComponents(discord_js_1.ButtonBuilder.from(interaction.message.components[0].components[0]).setDisabled(true), discord_js_1.ButtonBuilder.from(interaction.message.components[0].components[1]).setDisabled(true));
                    interaction.message.edit({ components: [row] });
                    const ticketRowReq = new discord_js_1.ActionRowBuilder()
                        .addComponents(new discord_js_1.ButtonBuilder()
                        .setCustomId("close_ticket")
                        .setStyle(discord_js_1.ButtonStyle.Danger)
                        .setLabel("Close Ticket")
                        .setDisabled(true)
                        .setEmoji("✖"), new discord_js_1.ButtonBuilder()
                        .setCustomId("log_transcript")
                        .setStyle(discord_js_1.ButtonStyle.Secondary)
                        .setLabel("Log Transcript")
                        .setEmoji("📰"));
                    const ticketClosed = new discord_js_1.EmbedBuilder()
                        .setAuthor({ name: `Ticket Closed - ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() || undefined })
                        .setDescription(`Ticket has been closed. The ticket creator, and any added users have been removed and can no longer view the ticket.
						**Reason:** ${reqTicket.closeReason}
						
						Click \`Log Transcript\` to log the transcript.`)
                        .setColor("Green")
                        .setTimestamp();
                    (_p = interaction.channel) === null || _p === void 0 ? void 0 : _p.send({ embeds: [ticketClosed], components: [ticketRowReq] });
                    const ticketClosedDM = new discord_js_1.EmbedBuilder()
                        .setAuthor({ name: "Ticket Closed", iconURL: interaction.guild.iconURL() || undefined })
                        .setDescription(`Ticket \`#${(_q = interaction.channel) === null || _q === void 0 ? void 0 : _q.name.split('-')[1]}\` has been closed!
						
						${config_1.config.bulletpointEmoji} **Reason:** ${reqTicket.closeReason}`)
                        .setColor("Green")
                        .setTimestamp();
                    await ((_r = interaction.channel) === null || _r === void 0 ? void 0 : _r.edit({
                        name: `closed-${interaction.channel.name.split('-')[1]}`
                    }).catch(async (err) => {
                        (0, GenUtils_1.handleError)(err);
                        await interaction.editReply((0, GenUtils_1.errorEmbed)(`An error occurred!\n\`${err.name}\``));
                        return;
                    }));
                    await interaction.channel.permissionOverwrites.edit(reqTicket.creatorID, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false });
                    const creator = interaction.client.users.cache.get(reqTicket.creatorID);
                    if (creator) {
                        creator.send({ embeds: [ticketClosedDM] }).catch(() => { });
                    }
                    for (const user of reqTicket.users) {
                        await interaction.channel.permissionOverwrites.edit(user, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false });
                        const foundUser = interaction.client.users.cache.get(user);
                        if (!foundUser)
                            return;
                        await foundUser.send({ embeds: [ticketClosedDM] }).catch(() => { });
                    }
                    interaction.editReply({ content: "Ticket closed." });
                    break;
                case "req_keep_open":
                    await interaction.deferReply({ ephemeral: true });
                    const reqTicket2 = await Tickets_1.default.findOne({
                        guildID: interaction.guild.id,
                        channelID: (_s = interaction.channel) === null || _s === void 0 ? void 0 : _s.id,
                        status: true
                    });
                    if (!reqTicket2) {
                        interaction.editReply((0, GenUtils_1.errorEmbed)("Ticket already closed."));
                        return;
                    }
                    if (reqTicket2.creatorID !== interaction.user.id) {
                        interaction.editReply({ content: "This is not your button!" });
                        return;
                    }
                    await reqTicket2.updateOne({
                        closeReason: "None"
                    });
                    const reqRow = new discord_js_1.ActionRowBuilder()
                        .addComponents(discord_js_1.ButtonBuilder.from(interaction.message.components[0].components[0]).setDisabled(true), discord_js_1.ButtonBuilder.from(interaction.message.components[0].components[1]).setDisabled(true));
                    interaction.message.edit({ components: [reqRow] });
                    (_t = interaction.channel) === null || _t === void 0 ? void 0 : _t.send({ content: "Close request denied!" }).catch(() => { });
                    interaction.editReply({ content: "Cancelled close request." });
                    break;
            }
            // Update ticket status message
            const ticketStatusMessage = await TicketStatus_1.default.findOne({
                guildId: interaction.guildId
            });
            const status = await (0, TicketStatusUpdate_1.updateTicketStatus)();
            if ((ticketStatusMessage === null || ticketStatusMessage === void 0 ? void 0 : ticketStatusMessage.ticketStatus) !== status) {
                if (ticketStatusMessage) {
                    const channel = await interaction.guild.channels.fetch(ticketStatusMessage.channelId);
                    let message = null;
                    try {
                        message = await (channel === null || channel === void 0 ? void 0 : channel.messages.fetch(ticketStatusMessage.messageId));
                    }
                    catch (err) {
                        // TODO: Use the logger. console.log is deprecated
                        console.log(err);
                    }
                    await (message === null || message === void 0 ? void 0 : message.delete());
                    const tEmbed = await (0, TicketStatusUpdate_1.resolveTicketStatusEmbed)(status);
                    const newEmbed = await channel.send({
                        embeds: [
                            tEmbed
                        ]
                    });
                    await ticketStatusMessage.deleteOne();
                    await TicketStatus_1.default.create({
                        guildId: interaction.guildId,
                        channelId: newEmbed.channelId,
                        messageId: newEmbed.id,
                        ticketStatus: status
                    });
                }
            }
        }
        else if (interaction.isModalSubmit()) {
            const customID = interaction.customId;
            switch (customID) {
                case "modal_close_reason":
                    await interaction.deferReply({ ephemeral: true });
                    const foundTicket = await Tickets_1.default.findOne({
                        guildID: interaction.guild.id,
                        channelID: (_u = interaction.channel) === null || _u === void 0 ? void 0 : _u.id,
                        status: true
                    });
                    if (!foundTicket) {
                        interaction.editReply((0, GenUtils_1.errorEmbed)("Ticket already closed."));
                        return;
                    }
                    await foundTicket.updateOne({
                        closeReason: interaction.fields.getTextInputValue('close_reason') || "No reason found!",
                        status: false
                    });
                    let ticketRow = new discord_js_1.ActionRowBuilder()
                        .addComponents(new discord_js_1.ButtonBuilder()
                        .setCustomId("close_ticket")
                        .setStyle(discord_js_1.ButtonStyle.Danger)
                        .setLabel("Close Ticket")
                        .setDisabled(true)
                        .setEmoji("✖"));
                    await ((_v = interaction.message) === null || _v === void 0 ? void 0 : _v.edit({ components: [ticketRow] }));
                    ticketRow = new discord_js_1.ActionRowBuilder()
                        .addComponents(new discord_js_1.ButtonBuilder()
                        .setCustomId("log_transcript")
                        .setStyle(discord_js_1.ButtonStyle.Secondary)
                        .setLabel("Log Transcript")
                        .setEmoji("📰"));
                    const ticketClosed = new discord_js_1.EmbedBuilder()
                        .setAuthor({ name: `Ticket Closed - ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() || undefined })
                        .setDescription(`Ticket has been closed. The ticket creator, and any added users have been removed and can no longer view the ticket.
						**Reason:** ${interaction.fields.getTextInputValue('close_reason') || "No reason found!"}
						
						Click \`Log Transcript\` to log the transcript.`)
                        .setColor("Green")
                        .setTimestamp();
                    (_w = interaction.channel) === null || _w === void 0 ? void 0 : _w.send({ embeds: [ticketClosed], components: [ticketRow] });
                    const ticketClosedDM = new discord_js_1.EmbedBuilder()
                        .setAuthor({ name: "Ticket Closed", iconURL: interaction.guild.iconURL() || undefined })
                        .setDescription(`Ticket \`#${(_x = interaction.channel) === null || _x === void 0 ? void 0 : _x.name.split('-')[1]}\` has been closed!
						
						${config_1.config.bulletpointEmoji} **Reason:** ${interaction.fields.getTextInputValue('close_reason') || "No reason found!"}`)
                        .setColor("Green")
                        .setTimestamp();
                    await ((_y = interaction.channel) === null || _y === void 0 ? void 0 : _y.edit({
                        name: `closed-${interaction.channel.name.split('-')[1]}`
                    }).catch(async (err) => {
                        (0, GenUtils_1.handleError)(err);
                        await interaction.editReply((0, GenUtils_1.errorEmbed)(`An error occurred!\n\`${err.name}\``));
                        return;
                    }));
                    await interaction.channel.permissionOverwrites.edit(foundTicket.creatorID, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false });
                    const creator = interaction.client.users.cache.get(foundTicket.creatorID);
                    if (creator) {
                        creator.send({ embeds: [ticketClosedDM] }).catch(() => { });
                    }
                    for (const user of foundTicket.users) {
                        await interaction.channel.permissionOverwrites.edit(user, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false });
                        const foundUser = interaction.client.users.cache.get(user);
                        if (!foundUser)
                            return;
                        await foundUser.send({ embeds: [ticketClosedDM] }).catch(() => { });
                    }
                    interaction.editReply({ content: "Ticket closed." });
                    break;
            }
        }
    }
};
async function getTicketTranscriptByID(id) {
    try {
        const media = (0, fs_1.readdirSync)(path_1.default.join(__dirname, "../..", "transcripts", `${id}`, "media"));
        const md = (0, fs_1.readFileSync)(path_1.default.join(__dirname, "../..", "transcripts", `${id}`, "ticket_transcript.md"));
        const txt = (0, fs_1.readFileSync)(path_1.default.join(__dirname, "../..", "transcripts", `${id}`, "ticket_transcript.txt"));
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
    const scriptsChannel = interaction.guild.channels.cache.find(c => c.name.toLowerCase() == "transcripts");
    if (!scriptsChannel)
        return;
    const foundTicket = await Tickets_1.default.findOne({
        guildID: (_a = interaction.guild) === null || _a === void 0 ? void 0 : _a.id,
        channelID: ticket_id,
    });
    if (!foundTicket)
        return;
    const user = await interaction.client.users.fetch(foundTicket.creatorID);
    const results = await getTicketTranscriptByID(ticket_id);
    const transcriptEmbed = new discord_js_1.EmbedBuilder()
        .setAuthor({ name: `Ticket #${(_b = interaction.channel) === null || _b === void 0 ? void 0 : _b.name.split('-')[1]} Transcript`, iconURL: ((_c = interaction.guild) === null || _c === void 0 ? void 0 : _c.iconURL()) || undefined })
        .setThumbnail(user.displayAvatarURL() || null)
        .setDescription(`${config_1.config.bulletpointEmoji} **Creator:** <@${foundTicket.creatorID}>
		${config_1.config.bulletpointEmoji} **Closer:** <@${closerID}>
		${config_1.config.bulletpointEmoji} **Reason:** ${foundTicket.closeReason}`)
        .setColor("Green")
        .setTimestamp();
    if (!results) {
        // Backup: no transcript session was found
        const fetched = await ((_d = interaction.channel) === null || _d === void 0 ? void 0 : _d.messages.fetch({ limit: 100 }));
        if (!fetched)
            return;
        let s = "";
        for (const msg of Array.from(fetched.values())) {
            s += `From ${msg.author.tag} (${msg.author.id})\n    ` + ((_e = msg.content) !== null && _e !== void 0 ? _e : "") + "\n";
        }
        const buffer = Buffer.from((0, lodash_1.escapeRegExp)(s), 'utf-8');
        const msg = await scriptsChannel.send({
            embeds: [transcriptEmbed],
        });
        const thread = await msg.startThread({
            name: `Ticket #${(_f = interaction.channel) === null || _f === void 0 ? void 0 : _f.name.split('-')[1]}`,
            autoArchiveDuration: 60,
            reason: `Transcript`,
        });
        thread.send({
            files: [
                { attachment: buffer, name: ticketname + ".txt" }
            ]
        });
        return;
    }
    const msg = await scriptsChannel.send({
        embeds: [transcriptEmbed],
        files: [
            { attachment: results.md, name: ticketname + '.md' },
            { attachment: results.txt, name: ticketname + '.txt' }
        ]
    });
    const thread = await msg.startThread({
        name: `Ticket-${(_g = interaction.channel) === null || _g === void 0 ? void 0 : _g.name.split('-')[1]} Media`,
        autoArchiveDuration: discord_js_1.ThreadAutoArchiveDuration.OneDay,
        reason: 'Ticket Media'
    });
    for (const mediaFile of results.media) {
        await thread.send({
            content: mediaFile,
            files: [
                path_1.default.join(__dirname, "../..", "transcripts", `${ticket_id}`, "media", `${mediaFile}`)
            ]
        });
    }
}
