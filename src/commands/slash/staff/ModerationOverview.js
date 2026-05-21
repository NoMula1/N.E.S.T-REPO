"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const Case_1 = __importDefault(require("../../../schemas/Case"));
const GlobalScope_1 = require("../../../bootstrap/GlobalScope");
function generateOverviewGraph(data) {
}
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("moderation_overview")
    .setDescription("Receive charts based on moderation")
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageMessages)
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.AssistantAdministrator,
    Scope: GlobalScope_1.Scope.Admin
})
    .setExecutor(async (interaction) => {
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    const cases30d = await Case_1.default.find({
        dateIssued: {
            $gt: Date.now() - 2592000000
        }
    });
    console.log(generateOverviewGraph(cases30d));
});
