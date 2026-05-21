"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const FastFlag_1 = __importDefault(require("../../../schemas/FastFlag"));
const discord_js_1 = require("discord.js");
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("flag")
    .setDescription("Toggle a fast flag")
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageMessages)
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.Moderator,
    HasRole: ['1195598692569337918']
})
    .addStringOption(op => {
    // This will be populated dynamically with autocomplete
    return op.setName('reference_name')
        .setDescription('The fast flag name')
        .setRequired(true)
        .setAutocomplete(true);
})
    .setExecutor(async (interaction) => {
    const refName = interaction.options.getString('reference_name');
    await interaction.deferReply();
    const flagFound = await FastFlag_1.default.findOne({
        refName: refName
    });
    if (!flagFound) {
        await interaction.editReply('Could not find a fast flag with that reference name.');
        return;
    }
    flagFound.enabled = !flagFound.enabled;
    if (flagFound.enabled) {
        flagFound.enabledBy = interaction.user.id;
    }
    else {
        flagFound.enabledBy = undefined;
    }
    flagFound.save().then(async (newEntry) => {
        await interaction.editReply(`\`${flagFound.refName}\` is now __${flagFound.enabled ? 'enabled' : 'disabled'}__.`);
    });
});
