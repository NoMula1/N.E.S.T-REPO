"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const HandleFunnyMutes_1 = require("../../../utils/HandleFunnyMutes");
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("funnymute")
    .setDescription("Funnily Mute a user")
    .addUserOption(opt => opt.setName("user")
    .setDescription("The user to mute")
    .setRequired(true))
    .addStringOption(opt => opt.setName('mutetype')
    .setRequired(true)
    .setDescription('The mute type')
    .addChoices(...HandleFunnyMutes_1.muteTypes.map(v => {
    return {
        name: v,
        value: v
    };
})))
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.BanMembers)
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.Administrator
})
    .setExecutor(async (interaction) => {
    var _a;
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    const type = interaction.options.getString("mutetype");
    const user = interaction.options.getUser("user");
    const found = HandleFunnyMutes_1.muteMap.get((_a = user === null || user === void 0 ? void 0 : user.id) !== null && _a !== void 0 ? _a : '');
    if (found) {
        interaction.reply(`❌FAILED: ${user === null || user === void 0 ? void 0 : user.tag} is already muted!`);
        return;
    }
    if (!user) {
        interaction.reply(`❌FAILED: User not found!`);
        return;
    }
    if (type && HandleFunnyMutes_1.muteTypes.includes(type.toString())) {
        await (0, HandleFunnyMutes_1.applyFunnyMute)(user, type, interaction);
    }
    else {
        await interaction.reply(`Unknown mute type!`);
    }
});
