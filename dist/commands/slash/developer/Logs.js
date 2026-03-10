"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GlobalScope_1 = require("../../../bootstrap/GlobalScope");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const node_child_process_1 = require("node:child_process");
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("logs")
    .setDescription("Download NEST's logs.")
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.Developer,
    IsUser: ["1149913737558499358"],
    Scope: GlobalScope_1.Scope.Admin
})
    .setExecutor(async (interaction) => {
    await interaction.deferReply();
    let command;
    switch (process.platform) {
        case 'linux':
            command = 'pm2 logs Core --nostream --lines=1000';
            break;
        default:
            command = 'npx pm2 logs Core --nostream --lines=1000';
            break;
    }
    (0, node_child_process_1.exec)(command, async (err, stdout) => {
        if (err) {
            await interaction.editReply(err);
            return;
        }
        const buffer = Buffer.from(stdout, 'utf-8');
        await interaction.editReply({
            files: [
                { attachment: buffer, name: 'logs.txt' }
            ]
        });
    });
});
