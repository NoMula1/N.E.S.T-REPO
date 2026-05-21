"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const node_util_1 = require("node:util");
const node_child_process_1 = require("node:child_process");
const exec = (0, node_util_1.promisify)(node_child_process_1.exec);
const logging_1 = require("../../../utils/logging");
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("update")
    .setDescription("Checks out the latest bot version and restarts")
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.Developer,
})
    .setExecutor(async (interaction) => {
    await interaction.reply({ content: 'Updating...', ephemeral: true });
    await interaction.editReply("Pulling from repo...");
    const startPull = Date.now();
    exec('git pull').then(async (r) => {
        await interaction.editReply(`PULL -> \`${Date.now() - startPull}ms\`\n\`\`\`fix\nOut~\n${r.stdout.substring(0, 300) + ((r.stdout.length > 300) ? '\n...' : '')}\`\`\`\n\nRestarting...`);
        await exec('pm2 restart core').catch((err) => { });
        // catch if not running pm2
        process.exit(-1);
    }).catch(async (err) => {
        await interaction.editReply(`Failed to pull from repo. Check logs for more information.`);
        logging_1.Log.error(`Failed to pull from repo during update request:\n${err}`);
        return;
    });
});
