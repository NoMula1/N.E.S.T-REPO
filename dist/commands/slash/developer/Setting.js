"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const Settings_1 = __importDefault(require("../../../schemas/Settings"));
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("setting")
    .setDescription("Change an NEST configuration")
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.Developer,
})
    .addStringOption(op => op.setName('setting_name')
    .setDescription('The name of the setting')
    .setRequired(true))
    .addStringOption(op => op.setName('setting_type')
    .setDescription('The data type of the setting to edit')
    .addChoices({ name: 'String', value: 'string' }, { name: 'Number', value: 'number' }, { name: 'Boolean', value: 'boolean' })
    .setRequired(true))
    .addStringOption(op => op.setName('setting_value')
    .setDescription('The setting value')
    .setRequired(true))
    .setExecutor(async (interaction) => {
    const settingName = interaction.options.getString('setting_name');
    const settingType = interaction.options.getString('setting_type');
    const settingValue = interaction.options.getString('setting_value');
    await interaction.deferReply();
    // Convert to correct data type
    let trueData = '';
    switch (settingType) {
        case 'string': {
            trueData = settingValue;
            break;
        }
        case 'number': {
            trueData = parseInt(settingValue);
            break;
        }
        case 'boolean': {
            const formattedValue = settingValue.toLowerCase().trim();
            if (formattedValue === 'true') {
                trueData = true;
            }
            else if (formattedValue === 'false') {
                trueData = false;
            }
            else {
                await interaction.editReply('Failed to parse boolean correctly. Please make sure it\'s either "true" or "false".');
                return;
            }
        }
    }
    const guildSettings = await Settings_1.default.findOne({
        guildID: interaction.guildId
    });
    if (!guildSettings) {
        await interaction.editReply('Failed to find guild settings.');
        return;
    }
    const foundIndex = await guildSettings.schema.paths[settingName];
    if (!foundIndex) {
        await interaction.editReply('Failed to find a setting with that name.');
        return;
    }
    guildSettings.set(settingName, trueData);
    await guildSettings.save();
    await interaction.editReply(`Saved.`);
});
