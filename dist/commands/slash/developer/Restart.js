"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const Settings_1 = __importDefault(require("../../../schemas/Settings"));
const exec = (0, node_util_1.promisify)(node_child_process_1.exec);
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("restart")
    .setDescription("Restarts the bot")
    .addBooleanOption(option => option.setName("stop")
    .setDescription("If the process will be killed instead"))
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.Developer,
    IsUser: ["1149913737558499358"]
})
    .setExecutor(async (interaction) => {
    const resultMessage = await interaction.deferReply({ fetchReply: true });
    const stop = interaction.options.getBoolean("stop", false);
    const guildSettings = await Settings_1.default.findOne({
        guildID: interaction.guildId
    });
    if (!guildSettings) {
        await interaction.editReply('Failed to find guild settings.');
        return;
    }
    try {
        if (stop) {
            await interaction.editReply({ content: 'Stopping...' });
            await exec("pm2 stop all").catch(() => { });
            process.exit(-1); // Catch for cases where not using pm2
        }
        else {
            // Restart with pm2
            await interaction.editReply({ content: 'Restarting...' });
            await exec("pm2 restart Core").catch((err) => { });
        }
    }
    catch (e) {
        await interaction.editReply({ content: `Unable to ${stop ? "stop" : "restart"}: ${e}` });
    }
});
