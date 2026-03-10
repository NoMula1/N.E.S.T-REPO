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
    var _a;
    await interaction.targetMessage.reply({
        content: `Hey! This is the wrong channel to market in, please read <#1243129204770603018> then use \`/post\` when you're ready!`
    });
    await interaction.targetMessage.delete().catch(() => { });
    await interaction.reply({
        content: `Successfully issued a verbal warning to \`${interaction.targetMessage.author.username}\``,
        ephemeral: true
    }).catch(() => { });
    await (0, GenUtils_1.sendModLogs)({ guild: interaction.guild, mod: await interaction.guild.members.fetch(interaction.member.user.id), action: "Market Warn" }, { title: "Context Command", actionInfo: `**Market Misuse** by <@${(_a = interaction.targetMessage.member) === null || _a === void 0 ? void 0 : _a.id}>\n> **Message**:\n> ${interaction.targetMessage} `, channel: interaction.channel || undefined });
});
