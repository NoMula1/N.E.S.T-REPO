"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const Qotd_1 = __importDefault(require("../../../schemas/Qotd"));
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("question")
    .setDescription("Edit/View the QOTD Queue")
    .addStringOption(opt => opt.setName("add")
    .setDescription("Add a question to the Qotd Queue")
    .setRequired(false))
    .addBooleanOption(opt => opt
    .setName("list")
    .setDescription("List all of the qotd questions")
    .setRequired(false))
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.BanMembers // we need to find a better "base" staff permission
)
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.AssistantModerator,
    HasRole: ['704146950907363418']
})
    .setExecutor(async (interaction) => {
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    const add = interaction.options.getString("add");
    const list = interaction.options.getBoolean("list");
    if (!add && !list || add && list) {
        interaction.reply({ content: "You must use a valid option", ephemeral: true });
        return;
    }
    if (add) {
        const newQuestion = new Qotd_1.default({
            question: add,
            userID: interaction.member.id
        });
        await newQuestion.save();
        interaction.reply({ embeds: [new discord_js_1.EmbedBuilder()
                    .setColor("Green")
                    .setDescription(`Added "${add}" to the qotd list`)
            ], ephemeral: true });
        return;
    }
    ;
    if (list) {
        const questions = await Qotd_1.default.find({});
        if (questions.length === 0) {
            interaction.reply({ content: "Failed to fetch any questions to list", ephemeral: true });
            return;
        }
        const questionList = questions.map(q => {
            var _a;
            const user = (_a = interaction.guild) === null || _a === void 0 ? void 0 : _a.members.cache.get(q.userID);
            return `**Question:** ${q.question}\n**Added by:** ${user ? user.displayName : 'Unknown User'}`;
        }).join('\n\n');
        interaction.reply({ embeds: [new discord_js_1.EmbedBuilder()
                    .setColor("Green")
                    .setDescription(questionList)
            ] });
    }
});
