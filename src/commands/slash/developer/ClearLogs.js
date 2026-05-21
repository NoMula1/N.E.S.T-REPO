"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const node_child_process_1 = require("node:child_process");
const GenUtils_1 = require("../../../utils/GenUtils");
const GlobalScope_1 = require("../../../bootstrap/GlobalScope");
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("clearlogs")
    .setDescription("Clear NEST's logs")
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.Developer,
    Scope: GlobalScope_1.Scope.Admin
})
    .setExecutor(async (interaction) => {
    await interaction.deferReply();
    (0, node_child_process_1.exec)('npx pm2 flush', async (err) => {
        if (err) {
            await interaction.editReply(err);
            (0, GenUtils_1.handleError)(err);
            return;
        }
        await interaction.editReply('Cleared logs.');
    });
});
