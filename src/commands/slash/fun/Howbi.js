"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("howbi")
    .setDescription("How bi are you?")
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.None,
})
    .setExecutor(async (interaction) => {
    await interaction.reply({ content: "Yes. <:biflag:1063706578357850212>" });
});
