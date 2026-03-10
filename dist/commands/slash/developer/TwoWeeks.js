"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const moreMessages = "... And more";
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("two_weeks")
    .setDescription("Members who joined less than two weeks ago")
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.Developer,
    HasRole: ["1177007392668536873"]
})
    .setExecutor(async (interaction) => {
    if (!interaction.inCachedGuild()) {
        await interaction.reply('You must be in a cached guild to use this command!');
        return;
    }
    await interaction.deferReply();
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    try {
        await interaction.guild.members.fetch();
        const recentMembers = interaction.guild.members.cache.filter((member) => {
            return member.joinedAt > twoWeeksAgo;
        });
        const recentMemberNames = [];
        let len = 0;
        let limitReached = false;
        for (const recentMember of recentMembers.values()) {
            len += recentMember.user.username.length;
            if ((len + moreMessages.length + 3) >= 4096) {
                limitReached = true;
                break;
            }
            recentMemberNames.push(recentMember.user.username);
        }
        await interaction.editReply({
            embeds: [
                new discord_js_1.EmbedBuilder()
                    .setTitle('Member List')
                    .setDescription('Members that joined less than **two weeks ago**:\n- ' + recentMemberNames.join("\n- ") + `${limitReached ? ('\n' + moreMessages) : ''}`)
            ]
        });
    }
    catch (err) {
        await interaction.editReply(`Failed: ${err}`);
    }
});
