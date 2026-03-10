"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const ContextCommandExecutor_1 = require("../../../utils/ContextCommandExecutor");
const logging_1 = require("../../../utils/logging");
const GenUtils_1 = require("../../../utils/GenUtils");
const ms_1 = __importDefault(require("ms"));
exports.default = new ContextCommandExecutor_1.MessageContextCommandExecutor()
    .setName("Disrespectful Content")
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.AssistantModerator,
    HasRole: ['1195598692569337918']
})
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageMessages)
    .setExecutor(async (interaction) => {
    var _a, _b, _c, _d, _e, _f;
    if (((_a = interaction.targetMessage.member) === null || _a === void 0 ? void 0 : _a.roles.highest.rawPosition) < ((_f = (_e = (await ((_b = interaction.guild) === null || _b === void 0 ? void 0 : _b.members.fetch((_d = (_c = interaction.member) === null || _c === void 0 ? void 0 : _c.user) === null || _d === void 0 ? void 0 : _d.id)))) === null || _e === void 0 ? void 0 : _e.roles.highest.rawPosition) !== null && _f !== void 0 ? _f : 0)) {
        await interaction.targetMessage.reply({
            embeds: [
                new discord_js_1.EmbedBuilder()
                    .setTitle(`Disrespectful Content`)
                    .setDescription(`Please remember to follow our [Server Rules](https://canary.discord.com/channels/489424959270158356/753682979284451368/796282622497521704)`
                    + '\n\nYour message has been flagged for as disrespectful. Messages that disrespect another member or their race, culture, religion, etc, are not allowed.'
                    + '\nFurther rule violations may lead to a more severe punishment! Thank you for keeping NIGHTHAWK SERVERS safe.')
                    .setFooter({
                    text: 'NIGHTHAWK SERVERS Flagging'
                })
                    .setColor(0xFF3B30)
            ]
        }).catch(() => { }).then(async () => {
            var _a;
            interaction.targetMessage.member.timeout((0, ms_1.default)("5m"), '[Interaction App Flagging]: Flag for disrespectful content').catch((err) => {
                logging_1.Log.error(`Missing permissions to timeout user ${interaction.targetMessage.member.id} for interaction app flagging`);
            });
            await interaction.targetMessage.delete().catch(() => { });
            await interaction.reply({
                content: `Successfully issued a verbal warning to \`${interaction.targetMessage.author.username}\``,
                ephemeral: true
            });
            await (0, GenUtils_1.sendModLogs)({ guild: interaction.guild, mod: await interaction.guild.members.fetch(interaction.member.user.id), action: "Ban" }, { title: "Context Command", actionInfo: `**Disrespect** issued to <@${(_a = interaction.targetMessage.member) === null || _a === void 0 ? void 0 : _a.id}>\n> **Message**:\n> ${interaction.targetMessage} `, channel: interaction.channel || undefined });
        });
    }
    else {
        await interaction.reply({
            content: `You cannot issue a warning to a user with a higher role than you.`,
            ephemeral: true
        });
    }
});
