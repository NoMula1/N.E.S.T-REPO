"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const GlobalScope_1 = require("../../../bootstrap/GlobalScope");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const discord_js_1 = require("discord.js");
const logging_1 = require("../../../utils/logging");
const PostTemplates_1 = __importDefault(require("../../../schemas/PostTemplates"));
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("debug")
    .setDescription("Debug commands for NEST bot developers")
    .addStringOption(opt => opt.setName("operation")
    .setDescription("Operation to execute")
    .addChoices({ name: "🔃 Query Role Raw Position", value: "query_role_rawposition" }, { name: "📍 Query Pending Posts", value: "query_pending_posts" })
    .setRequired(true))
    .addUserOption(opt => opt.setName("send_to")
    .setDescription("If available, send the output to a specific user"))
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.Developer,
    Scope: GlobalScope_1.Scope.Default
})
    .setExecutor(async (interaction) => {
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    const sendto = interaction.options.getMember("send_to");
    switch (interaction.options.getString("operation")) {
        case "query_role_rawposition":
            const roles = interaction.guild.roles.cache.sort((r1, r2) => r2.position - r1.position)
                .map(role => `${role.name}: ${role.position}`)
                .join('\n');
            await interaction.reply({
                files: [
                    new discord_js_1.AttachmentBuilder(Buffer.from(roles), {
                        name: 'rawposition.txt'
                    })
                ]
            }).catch((e) => logging_1.Log.error(e));
            return;
        case "query_pending_posts":
            const cases = await PostTemplates_1.default.find({ waitingForApproval: true });
            const approvalChannel = interaction.guild.channels.cache.find((c) => {
                if (c.type === discord_js_1.ChannelType.GuildText) {
                    if (c.name === "template-approvals") {
                        return c;
                    }
                }
            });
            if (!cases) {
                await interaction.reply({ content: "No pending posts found", ephemeral: true }).catch((e) => {
                    logging_1.Log.error(e);
                });
            }
            else {
                try {
                    const cases = await PostTemplates_1.default.find({ waitingForApproval: true }).lean();
                    if (cases.length === 0) {
                        await interaction.reply({ content: "No pending posts found", ephemeral: true });
                    }
                    else {
                        await interaction.reply({ content: "Sending pending posts...", ephemeral: true });
                        const chunkedPosts = chunk(cases, 40);
                        for (const chunk of chunkedPosts) {
                            const embed = new discord_js_1.EmbedBuilder()
                                .setTitle("[DEBUG] Posts Awaiting Verification")
                                .setColor("Blurple")
                                .setDescription(chunk.map(post => {
                                if (post.approvalMessageID && (approvalChannel === null || approvalChannel === void 0 ? void 0 : approvalChannel.id)) {
                                    return `https://discord.com/channels/${interaction.guildId}/${approvalChannel.id}/${post.approvalMessageID}`;
                                }
                                return 'N/A';
                            }).join('\n'));
                            if (sendto) {
                                if (!sendto.createDM())
                                    sendto.createDM();
                                await sendto.send({ embeds: [embed] });
                                return;
                            }
                            else {
                                if (!interaction.user.createDM())
                                    interaction.user.createDM();
                                await interaction.user.send({ embeds: [embed] });
                            }
                            ;
                            await interaction.editReply({ content: "Sent pending posts!" });
                        }
                    }
                }
                catch (e) {
                    await interaction.reply({ content: "An error occurred while fetching pending posts", ephemeral: true });
                    logging_1.Log.error(`[DEBUG] An error occurred while fetching pending posts: ${e}`);
                    return;
                }
            }
            return;
            break;
        default:
            interaction.reply({ content: "Invalid Subcommand", ephemeral: true });
            return;
    }
});
function chunk(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}
