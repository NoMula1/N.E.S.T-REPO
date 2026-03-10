"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const BitwiseTagHelpers_1 = require("../../../utils/BitwiseTagHelpers");
const FastFlag_1 = __importDefault(require("../../../schemas/FastFlag"));
const cooldownMap = new Map();
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("search_post")
    .setDescription("Perform a query on all posts with tagging")
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.None,
})
    .setExecutor(async (i) => {
    const flagFound = await FastFlag_1.default.findOne({
        refName: "ReleaseMarketTagSearch"
    });
    if (!flagFound || !flagFound.enabled)
        return;
    const currentCooldown = cooldownMap.get(i.user.id);
    if (currentCooldown && (Date.now() - currentCooldown) <= 30000) {
        await i.reply({
            content: `Woah, too fast there! That command has a 30 second cooldown. Please try again later.`,
            ephemeral: true
        });
        return;
    }
    const replyMessage = await i.reply({
        ephemeral: true,
        content: `0|N`,
        embeds: [
            new discord_js_1.EmbedBuilder()
                .setTitle('Post Query')
                .setColor(discord_js_1.Colors.Blurple)
                .setDescription(`You can search for posts using the below select menus. When you're ready to search, press **Search**, and I will open a new thread under that message.\n\nSelected Tags:\n\`\`\`\nNone\n\`\`\``)
                .setFooter({ text: `Ensure you only find the posts you're looking for with our staff-selected Market Tags` })
        ],
        components: [
            new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
                .setCustomId('post-search-execute')
                .setLabel('Search')
                .setStyle(discord_js_1.ButtonStyle.Secondary)),
            new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder()
                .addOptions((0, BitwiseTagHelpers_1.tagGroupAsOptions)())
                .setCustomId('post-search-group')
                .setPlaceholder('Choose a tag group'))
        ]
    });
    cooldownMap.set(i.user.id, Date.now());
});
