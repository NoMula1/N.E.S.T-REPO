"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const GlobalScope_1 = require("../../../bootstrap/GlobalScope");
const PostTemplates_1 = __importDefault(require("../../../schemas/PostTemplates"));
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("post_status_change")
    .setDescription("Forcefully approve or deny a post template")
    .addStringOption(opt => opt
    .setName("post_internal_id")
    .setDescription("Enter the post template id")
    .setRequired(true))
    .addBooleanOption(opt => opt
    .setName("new_status")
    .setDescription(`Whether the post should be approved or denied`)
    .setRequired(true))
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.Administrator,
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
    const postId = interaction.options.getString("post_internal_id");
    const newPostStatus = interaction.options.getBoolean("new_status");
    const foundTemplate = await PostTemplates_1.default.findOne({
        _id: postId
    });
    if (!foundTemplate) {
        await interaction.reply(`Failed to find that template.`);
        return;
    }
    foundTemplate.approved = newPostStatus;
    foundTemplate.waitingForApproval = false;
    await foundTemplate.save();
    await interaction.reply(`Successfully set the template's status in ${foundTemplate.jobType} to **${newPostStatus ? 'APPROVED' : 'REJECTED'}**\n\n**Warning:** This debug function does not send any informational messages to the user or the approval log channels. Please manually inform them if required.`);
});
