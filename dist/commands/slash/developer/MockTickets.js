"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("mock_ticket_embeds")
    .setDescription("Mock the tickets embed with buttons")
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.Developer,
})
    .setExecutor(async (interaction) => {
    var _a, _b;
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle("Contact Staff")
        .setColor("Green")
        .addFields({
        name: 'Important Information',
        value: `\n- If you have opened a ticket accidentally, please leave a short message and close it.\n`
            + `- Do **not** beg for roles\n`
            + `- Please do not ping staff, we have already been alerted\n\n`
    }, {
        name: 'What are Internal Affairs?',
        value: `The Internal Affairs button is a way for you to get in contact with Internal Reviewers, instead of regular staff. All content in these tickets are as confidential as possible.`
            + ` **Use this feature to report staff misconduct or other staff grievances.**`
    })
        .setDescription(`Need to contact staff to report someone, inquire about the server, or ask about partnerships? Here's the place to do it!\nhttps://nohello.net/`);
    const embed2 = new discord_js_1.EmbedBuilder()
        .setTitle('New Internal Affair Report')
        .setColor("Red")
        .setDescription(`This feature will open a ticket, used to report staff misconduct or staff grievances. This ticket will only be able to be viewed by Internal Reviewers.`
        + `\n\n**Click "Open Ticket" below to acknowledge this feature's intended usage**, and to open an Internal Affair Ticket.`);
    const actionRow = new discord_js_1.ActionRowBuilder();
    const actionRow2 = new discord_js_1.ActionRowBuilder();
    const openTicketButton = new discord_js_1.ButtonBuilder()
        .setLabel('Open Ticket')
        .setCustomId('mock-1')
        .setStyle(discord_js_1.ButtonStyle.Primary);
    const internalAffairsButton = new discord_js_1.ButtonBuilder()
        .setLabel('Internal Affairs')
        .setCustomId('mock-2')
        .setStyle(discord_js_1.ButtonStyle.Primary);
    const nevermindButton = new discord_js_1.ButtonBuilder()
        .setLabel('Nevermind')
        .setCustomId("mock-3")
        .setStyle(discord_js_1.ButtonStyle.Danger);
    const openTicketConfirmationButton = new discord_js_1.ButtonBuilder()
        .setLabel('Open Ticket')
        .setCustomId('mock-4')
        .setStyle(discord_js_1.ButtonStyle.Primary);
    actionRow.addComponents(openTicketButton, internalAffairsButton);
    actionRow2.addComponents(nevermindButton, openTicketConfirmationButton);
    await interaction.reply({
        ephemeral: true,
        content: 'Sent'
    });
    await ((_a = interaction.channel) === null || _a === void 0 ? void 0 : _a.send({
        embeds: [
            embed
        ],
        components: [
            actionRow.toJSON()
        ]
    }));
    await ((_b = interaction.channel) === null || _b === void 0 ? void 0 : _b.send({
        embeds: [
            embed2
        ],
        components: [
            actionRow2.toJSON()
        ]
    }));
});
