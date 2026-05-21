"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const config_1 = require("../../../utils/config");
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("members")
    .setDescription("Get the member count.")
    .addNumberOption(opt => opt.setName("member_count")
    .setDescription("See how many members we need to reach a goal!")
    .setRequired(false))
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.None,
})
    .setExecutor(async (interaction) => {
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    await interaction.deferReply();
    const members = interaction.options.getNumber("member_count");
    const fetchedMembers = await interaction.guild.members.fetch();
    const totalMembers = fetchedMembers.size.toLocaleString();
    const totalHumans = fetchedMembers.filter((member) => !member.user.bot).size.toLocaleString();
    const totalBots = fetchedMembers.filter((member) => member.user.bot).size.toLocaleString();
    let description = "Error, if this persists, contact an NEST developer.";
    if (members && !isNaN(members) && members > fetchedMembers.size) {
        description = `**${(members - fetchedMembers.size).toLocaleString()}** members until **${members.toLocaleString()}** members!`;
    }
    else {
        description = `${config_1.config.arrowEmoji} **${totalMembers}** total members
			${config_1.config.arrowEmoji} **${totalHumans}** total humans
			${config_1.config.arrowEmoji} **${totalBots}** total bots`;
    }
    const membersEmbed = new discord_js_1.EmbedBuilder()
        .setDescription(description)
        .setColor("Random");
    interaction.editReply({ embeds: [membersEmbed] });
});
