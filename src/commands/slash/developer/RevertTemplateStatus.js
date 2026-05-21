"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const GlobalScope_1 = require("../../../bootstrap/GlobalScope");
const PostTemplates_1 = __importDefault(require("../../../schemas/PostTemplates"));
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("revert_template_status")
    .setDescription("Revert all templates to unapproved states")
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.Developer,
    Scope: GlobalScope_1.Scope.Default
})
    .setExecutor(async (interaction) => {
    const allTemplates = await PostTemplates_1.default.find({
        guildID: interaction.guildId
    });
    await interaction.reply({
        content: `Running task on ${allTemplates.length} documents...`
    });
    const startTask = Date.now();
    for (const thisTemplate of allTemplates) {
        thisTemplate.approved = false;
        thisTemplate.waitingForApproval = false;
        thisTemplate.isQueueServed = false;
        await thisTemplate.save();
    }
    await interaction.editReply({
        content: `Updated ${allTemplates.length} documents in **${(Date.now() - startTask) / 1000}s** [\`${(Date.now() - startTask)}ms\`]`
    });
});
