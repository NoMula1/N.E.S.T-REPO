"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const Settings_1 = __importDefault(require("../../../schemas/Settings"));
const logging_1 = require("../../../utils/logging");
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("set_ban_image")
    .setDescription("Set the ban image for the server.")
    .addStringOption(opt => opt.setName("link")
    .setDescription("Enter the link for the image thats displayed after banning a user.")
    .setRequired(true))
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageMessages)
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.Developer,
})
    .setExecutor(async (interaction) => {
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    ;
    // im too lazy to add a regex check to see if the link is actually a link so just assume it is, its a dev command anyway
    const link = interaction.options.getString("link");
    const settings = await Settings_1.default.findOne({ guildID: interaction.guildId });
    await (settings === null || settings === void 0 ? void 0 : settings.updateOne({ banImageLink: link }).catch((err) => {
        logging_1.Log.error(err);
        return interaction.reply({ content: "An error occurred while updating the ban image. Please check the CONSOLE for more information!", ephemeral: true });
    }));
    await interaction.reply({ content: "Success! Updated the ban image for the server.", ephemeral: true });
});
