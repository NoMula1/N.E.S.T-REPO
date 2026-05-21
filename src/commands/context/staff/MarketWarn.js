"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const ContextCommandExecutor_1 = require("../../../utils/ContextCommandExecutor");
const GenUtils_1 = require("../../../utils/GenUtils");
exports.default = new ContextCommandExecutor_1.MessageContextCommandExecutor()
    .setName("Market Warn")
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.AssistantModerator,
    HasRole: ['1195598692569337918']
})
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageMessages)
    .setExecutor(async (interaction) => {
    var _a, _b, _c, _d, _e, _f, _g;
    if (((_a = interaction.targetMessage.member) === null || _a === void 0 ? void 0 : _a.roles.highest.rawPosition) < ((_f = (_e = (await ((_b = interaction.guild) === null || _b === void 0 ? void 0 : _b.members.fetch((_d = (_c = interaction.member) === null || _c === void 0 ? void 0 : _c.user) === null || _d === void 0 ? void 0 : _d.id)))) === null || _e === void 0 ? void 0 : _e.roles.highest.rawPosition) !== null && _f !== void 0 ? _f : 0)) {
        await interaction.targetMessage.reply({
            content: `Hey! This is the wrong channel to market in, please read <#1243129204770603018> then use \`/post\` when you're ready!`
        });
        await interaction.targetMessage.delete().catch(() => { });
        await interaction.reply({
            content: `Successfully issued a verbal warning to \`${interaction.targetMessage.author.username}\``,
            ephemeral: true
        }).catch(() => { });
        await (0, GenUtils_1.sendModLogs)({ guild: interaction.guild, mod: await interaction.guild.members.fetch(interaction.member.user.id), action: "Market Warn" }, { title: "Context Command", actionInfo: `**Market Misuse** by <@${(_g = interaction.targetMessage.member) === null || _g === void 0 ? void 0 : _g.id}>\n> **Message**:\n> ${interaction.targetMessage} `, channel: interaction.channel || undefined });
    }
    else {
        await interaction.reply({
            content: `You cannot issue a warning to a user with a higher role than you.`,
            ephemeral: true
        });
    }
});
