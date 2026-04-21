"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const PostTemplates_1 = __importDefault(require("../../../schemas/PostTemplates"));
const logging_1 = require("../../../utils/logging");
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("clear_template")
    .setDescription("Clear a user's post templates")
    .addUserOption(opt => opt.setName("user")
    .setDescription("User to select")
    .setRequired(true))
    .addStringOption(opt => opt.setName("type")
    .setDescription("Type of template to clear")
    .setRequired(true)
    .addChoices({ name: "FOR_HIRE", value: "for_hire" }, { name: "HIRING", value: "hiring" }, { name: "SELLING", value: "selling" }))
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.BanMembers)
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.Administrator,
    HasRole: ["1480435906044362814"]
    /**
     * 1480435906044362814 = Marketplace Manager
     */
})
    .setExecutor(async (interaction) => {
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    const user = interaction.options.getUser("user");
    const type = interaction.options.getString("type");
    if (!user || !type) {
        return;
    }
    switch (type) {
        case "for_hire":
            try {
                await PostTemplates_1.default.deleteOne({ userID: user.id, jobType: "SELLING" });
                interaction.reply({ content: `Successfully cleared the post template for ${user}`, ephemeral: true });
            }
            catch (err) {
                logging_1.Log.error(err);
                interaction.reply({ content: `Failed to clear the post template for ${user.username}`, ephemeral: true });
                return;
            }
            break;
        case "hiring":
            try {
                await PostTemplates_1.default.deleteOne({ userID: user.id, jobType: "SELLING" });
                interaction.reply({ content: `Successfully cleared the post template for ${user}`, ephemeral: true });
            }
            catch (err) {
                logging_1.Log.error(err);
                interaction.reply({ content: `Failed to clear the post template for ${user.username}`, ephemeral: true });
                return;
            }
            break;
        case "selling":
            try {
                await PostTemplates_1.default.deleteOne({ userID: user.id, jobType: "SELLING" });
                interaction.reply({ content: `Successfully cleared the post template for ${user}`, ephemeral: true });
            }
            catch (err) {
                logging_1.Log.error(err);
                interaction.reply({ content: `Failed to clear the post template for ${user.username}`, ephemeral: true });
                return;
            }
            break;
        default:
            break;
    }
});
