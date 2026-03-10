"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const config_1 = require("../../../utils/config");
const GenUtils_1 = require("../../../utils/GenUtils");
const Case_1 = __importDefault(require("../../../schemas/Case"));
const GlobalScope_1 = require("../../../bootstrap/GlobalScope");
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("deletecase")
    .setDescription("Delete a case from the database.")
    .addNumberOption(opt => opt
    .setName("case_number")
    .setDescription("Enter the case number you'd like to delete.")
    .setRequired(true))
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.Administrator,
    HasRole: ["1210559673791553587", "1203545417648967720"],
    /*
        1203545417648967720 = Help Forums Manager
    */
    Scope: GlobalScope_1.Scope.Admin
})
    .setExecutor(async (interaction) => {
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    const caseNum = interaction.options.getNumber("case_number") || 1;
    const foundCase = await Case_1.default.findOne({
        guildID: interaction.guild.id,
        caseNumber: caseNum
    });
    if (!foundCase) {
        interaction.reply((0, GenUtils_1.errorEmbed)("No case found!"));
        return;
    }
    foundCase.deleteOne().then(async () => {
        const embed = new discord_js_1.EmbedBuilder()
            .setColor("Green")
            .setDescription(`${config_1.config.successEmoji} Case \`#${caseNum}\` has been deleted.`);
        interaction.reply({ embeds: [embed] });
        await (0, GenUtils_1.sendModLogs)({
            guild: interaction.guild,
            mod: interaction.member,
            action: "Case Delete"
        }, {
            title: "Case Deleted",
            actionInfo: `**Mod:** <@${foundCase.modID}>\n> **Reason:** ${foundCase.reason}\n> **Case ID:** ${foundCase.caseNumber}\n> **User:** <@${foundCase.userID}>\n> **Date Issued:** <t:${Math.floor(foundCase.dateIssued / 1000)}:d> (<t:${Math.floor(foundCase.dateIssued / 1000)}:R>)\n> **Duration:** ${foundCase.duration}`,
            channel: interaction.channel || undefined
        });
    }).catch((err) => {
        (0, GenUtils_1.handleError)(err);
        interaction.reply((0, GenUtils_1.errorEmbed)("An error occurred while deleting the case!"));
    });
});
