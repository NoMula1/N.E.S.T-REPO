"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const GenUtils_1 = require("../../../utils/GenUtils");
const Case_1 = __importDefault(require("../../../schemas/Case"));
const config_1 = require("../../../utils/config");
const GlobalScope_1 = require("../../../bootstrap/GlobalScope");
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("case")
    .setDescription("View a specific case from a case number.")
    .addNumberOption(opt => opt
    .setName("case_number")
    .setDescription("Enter the case number you'd like to view.")
    .setRequired(true))
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageMessages)
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.AssistantModerator,
    HasRole: ["1138680448248188948", // Staff
        "1480436503187423342"], // Marketplace Department 
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
    const caseEmbed = new discord_js_1.EmbedBuilder()
        .setAuthor({ name: `Case #${foundCase.caseNumber}` })
        .setDescription(`${config_1.config.bulletpointEmoji} **User:** <@${foundCase.userID}>
			${config_1.config.bulletpointEmoji} **Mod:** <@${foundCase.modID}>
			${config_1.config.bulletpointEmoji} **Reason:** ${foundCase.reason}
			${config_1.config.bulletpointEmoji} **Expired:** ${foundCase.active ? "No" : "Yes"}
			${config_1.config.bulletpointEmoji} **Duration:** ${foundCase.duration}
			${config_1.config.bulletpointEmoji} **Date Issued:** <t:${Math.floor(foundCase.dateIssued / 1000)}:d> (<t:${Math.floor(foundCase.dateIssued / 1000)}:R>)`)
        .setColor("Blurple")
        .setTimestamp()
        .setFooter({ text: `Requested by: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() || undefined });
    interaction.reply({ embeds: [caseEmbed] });
});
