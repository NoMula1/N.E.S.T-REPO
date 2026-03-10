"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const Case_1 = __importDefault(require("../../../schemas/Case"));
const lodash_1 = __importDefault(require("lodash"));
const GenUtils_1 = require("../../../utils/GenUtils");
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("modlogs")
    .setDescription("View the moderation logs of a user.")
    .addUserOption(opt => opt.setName("user")
    .setDescription("Select the user you would like to view.")
    .setRequired(false))
    .addBooleanOption(opt => opt.setName("showmod")
    .setRequired(false)
    .setDescription("Show the mod user"))
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.None
})
    .setExecutor(async (interaction) => {
    var _a, _b, _c;
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    let user = interaction.options.getUser("user");
    const showMod = (_a = interaction.options.getBoolean("showmod")) !== null && _a !== void 0 ? _a : true;
    if (!user ||
        (!interaction.member.roles.cache.has('1195598692569337918') &&
            ((_b = interaction.member.guild.roles.cache.find((r) => r.name.toLowerCase() === "trial community staff")) === null || _b === void 0 ? void 0 : _b.position) > interaction.member.roles.highest.position)) {
        user = interaction.user;
    }
    const cases = await Case_1.default.find({
        guildID: interaction.guild.id,
        userID: user.id
    }).sort({ dateIssued: "descending" });
    const arr = [];
    for (const foundCase of cases) {
        if (!foundCase.caseNumber)
            return;
        let pusher = `\n\n__Case #${foundCase.caseNumber}__`;
        if (foundCase.modID && (showMod) && (interaction.member.roles.cache.has('1195598692569337918') || ((_c = interaction.member.guild.roles.cache.find((r) => r.name.toLowerCase() === "trial community staff")) === null || _c === void 0 ? void 0 : _c.position) <= interaction.member.roles.highest.position)) {
            pusher = pusher + `\n**Mod:** <@${foundCase.modID}>`;
        }
        if (foundCase.active !== null || foundCase.active !== undefined && foundCase.caseType !== "UNBAN" && foundCase.caseType !== "UNMUTE" && foundCase.caseType !== "KICK") {
            pusher = pusher + `\n**Expired:** ${foundCase.active ? "No" : "Yes"}`;
        }
        if (foundCase.caseType) {
            pusher = pusher + `\n**Case Type:** \`${foundCase.caseType}\``;
        }
        if (foundCase.reason) {
            pusher = pusher + `\n**Reason:** ${(foundCase.reason.length <= 150) ? foundCase.reason : `Too long; please run \`/case case_number:${foundCase.caseNumber}\``}`;
        }
        if (foundCase.duration && foundCase.durationUnix > 0) {
            pusher = pusher + `\n**Duration:** ${foundCase.duration}`;
        }
        if (foundCase.dateIssued) {
            pusher = pusher + `\n**Date Issued:** <t:${Math.floor(foundCase.dateIssued / 1000)}:d> (<t:${Math.floor(foundCase.dateIssued / 1000)}:R>)`;
        }
        arr.push(`${pusher}`);
    }
    const histArr = lodash_1.default.chunk(arr, 5);
    if (histArr.length == 0) {
        interaction.reply((0, GenUtils_1.errorEmbed)("This user does not have any past punishments."));
        return;
    }
    let row = new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId(`left`)
        .setStyle(discord_js_1.ButtonStyle.Success)
        .setDisabled(true)
        .setEmoji("◀"), new discord_js_1.ButtonBuilder()
        .setCustomId(`end_interaction`)
        .setStyle(discord_js_1.ButtonStyle.Danger)
        .setEmoji("✖"), new discord_js_1.ButtonBuilder()
        .setCustomId(`right`)
        .setStyle(discord_js_1.ButtonStyle.Success)
        .setDisabled(true)
        .setEmoji("▶"));
    let numbers = 0;
    const historyEmbed = new discord_js_1.EmbedBuilder()
        .setAuthor({ name: `${user.username}'s History (${numbers + 1}/${histArr.length})`, iconURL: user.displayAvatarURL() || undefined })
        .setColor("Green")
        .setDescription(`${histArr[numbers]}`)
        .setThumbnail((user === null || user === void 0 ? void 0 : user.displayAvatarURL()) || null)
        .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() || undefined })
        .setTimestamp();
    const histReply = await interaction.reply({ embeds: [historyEmbed], fetchReply: true, components: [row] });
    if (histArr.length > 1) {
        row = new discord_js_1.ActionRowBuilder()
            .addComponents(discord_js_1.ButtonBuilder.from(histReply.components[0].components[0]).setDisabled(true), discord_js_1.ButtonBuilder.from(histReply.components[0].components[1]).setDisabled(false), discord_js_1.ButtonBuilder.from(histReply.components[0].components[2]).setDisabled(false));
        histReply.edit({ components: [row] });
    }
    const collector = histReply.createMessageComponentCollector({ time: 50000 });
    collector.on("collect", async (bInteraction) => {
        if (bInteraction.user.id !== interaction.user.id) {
            bInteraction.reply({ content: "This is not your interaction!", ephemeral: true });
            return;
        }
        await bInteraction.deferUpdate();
        switch (bInteraction.customId) {
            case "left":
                if (numbers === 0)
                    return;
                numbers = numbers - 1;
                if (numbers === 0) {
                    row = new discord_js_1.ActionRowBuilder()
                        .addComponents(discord_js_1.ButtonBuilder.from(histReply.components[0].components[0]).setDisabled(true), discord_js_1.ButtonBuilder.from(histReply.components[0].components[1]), discord_js_1.ButtonBuilder.from(histReply.components[0].components[2]).setDisabled(false));
                }
                const histLeftEdit = new discord_js_1.EmbedBuilder()
                    .setAuthor({ name: `${user.username}'s History (${numbers + 1}/${histArr.length})`, iconURL: user.displayAvatarURL() || undefined })
                    .setColor("Green")
                    .setDescription(`${histArr[numbers]}`)
                    .setThumbnail((user === null || user === void 0 ? void 0 : user.displayAvatarURL()) || null)
                    .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() || undefined })
                    .setTimestamp();
                histReply.edit({ embeds: [histLeftEdit], components: [row] });
                break;
            case "end_interaction":
                row = new discord_js_1.ActionRowBuilder()
                    .addComponents(discord_js_1.ButtonBuilder.from(histReply.components[0].components[0]).setDisabled(true), discord_js_1.ButtonBuilder.from(histReply.components[0].components[1]).setDisabled(true), discord_js_1.ButtonBuilder.from(histReply.components[0].components[2]).setDisabled(true));
                const histEndInteraction = new discord_js_1.EmbedBuilder()
                    .setAuthor({ name: `${user.username}'s History (${numbers + 1}/${histArr.length})`, iconURL: user.displayAvatarURL() || undefined })
                    .setColor("Green")
                    .setDescription(`${histArr[numbers]}`)
                    .setThumbnail((user === null || user === void 0 ? void 0 : user.displayAvatarURL()) || null)
                    .setFooter({ text: `Requested by ${interaction.user.username} - Interaction Ended (User)`, iconURL: interaction.user.displayAvatarURL() || undefined })
                    .setTimestamp();
                histReply.edit({ embeds: [histEndInteraction], components: [row] });
                break;
            case "right":
                numbers = numbers + 1;
                if (histArr[numbers] == null) {
                    numbers = numbers - 1;
                    return;
                }
                if (histArr[numbers + 1] == null) {
                    row = new discord_js_1.ActionRowBuilder()
                        .addComponents(discord_js_1.ButtonBuilder.from(histReply.components[0].components[0]).setDisabled(false), discord_js_1.ButtonBuilder.from(histReply.components[0].components[1]), discord_js_1.ButtonBuilder.from(histReply.components[0].components[2]).setDisabled(true));
                }
                const histRightEdit = new discord_js_1.EmbedBuilder()
                    .setAuthor({ name: `${user.username}'s History (${numbers + 1}/${histArr.length})`, iconURL: user.displayAvatarURL() || undefined })
                    .setColor("Green")
                    .setDescription(`${histArr[numbers]}`)
                    .setThumbnail((user === null || user === void 0 ? void 0 : user.displayAvatarURL()) || null)
                    .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() || undefined })
                    .setTimestamp();
                histReply.edit({ embeds: [histRightEdit], components: [row] });
                break;
        }
    });
    collector.on("end", async (bInteraction) => {
        row = new discord_js_1.ActionRowBuilder()
            .addComponents(discord_js_1.ButtonBuilder.from(histReply.components[0].components[0]).setDisabled(false), discord_js_1.ButtonBuilder.from(histReply.components[0].components[1]), discord_js_1.ButtonBuilder.from(histReply.components[0].components[2]).setDisabled(true));
        const histEndInteraction = new discord_js_1.EmbedBuilder()
            .setAuthor({ name: `${user.username}'s History (${numbers + 1}/${histArr.length})`, iconURL: user.displayAvatarURL() || undefined })
            .setColor("Green")
            .setDescription(`${histArr[numbers]}`)
            .setThumbnail((user === null || user === void 0 ? void 0 : user.displayAvatarURL()) || null)
            .setFooter({ text: `Requested by ${interaction.user.username} - Interaction Ended (Auto)`, iconURL: interaction.user.displayAvatarURL() || undefined })
            .setTimestamp();
        histReply.edit({ embeds: [histEndInteraction], components: [row] });
    });
});
