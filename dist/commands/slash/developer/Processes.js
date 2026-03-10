"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const node_child_process_1 = require("node:child_process");
const GenUtils_1 = require("../../../utils/GenUtils");
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("processes")
    .setDescription("Get NEST's running processes")
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.Developer,
    HasRole: ["1177007392668536873"]
})
    .setExecutor(async (interaction) => {
    await interaction.deferReply();
    (0, node_child_process_1.exec)('npx pm2 jlist', async (err, stdout) => {
        if (err) {
            await interaction.editReply(err);
            (0, GenUtils_1.handleError)(err);
            return;
        }
        const procs = JSON.parse(stdout);
        let embeds;
        if (procs instanceof Array)
            embeds = procs.map((proc) => {
                console.log(proc.pm2_env);
                return new discord_js_1.EmbedBuilder()
                    .setTitle(`${proc.name || 'unknown'} (${proc.pid || -1})`)
                    .setDescription(proc.pm2_env.status || 'unknown')
                    .addFields({ name: 'Uptime', value: (0, GenUtils_1.formatTime)(Date.now() - parseInt((proc.pm2_env || {}).pm_uptime)) });
            });
        else
            embeds = [];
        await interaction.editReply({
            content: 'NEST Running processes.',
            embeds: embeds
        });
    });
});
