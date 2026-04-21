"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const GenUtils_1 = require("../../../utils/GenUtils");
const Tickets_1 = __importDefault(require("../../../schemas/Tickets"));
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("removeuser")
    .setDescription("Remove users from a ticket.")
    .addUserOption(opt => opt
    .setName("user")
    .setDescription("Enter the user you would like to remove.")
    .setRequired(true))
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.None,
})
    .setExecutor(async (interaction) => {
    var _a, _b;
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    const user = interaction.options.getUser("user");
    const member = interaction.options.getMember("user");
    if (!member || !user) {
        interaction.reply((0, GenUtils_1.errorEmbed)("This user is not in the server!"));
        return;
    }
    const foundTicket = await Tickets_1.default.findOne({
        guildID: interaction.guild.id,
        channelID: (_a = interaction.channel) === null || _a === void 0 ? void 0 : _a.id,
        status: true,
    });
    if (!foundTicket) {
        interaction.reply((0, GenUtils_1.errorEmbed)("This channel is not a valid ticket."));
        return;
    }
    if (interaction.user.id !== foundTicket.creatorID) {
        if (((_b = interaction.member.guild.roles.cache.find((r) => r.name.toLowerCase() === "assistant moderator")) === null || _b === void 0 ? void 0 : _b.position) > interaction.member.guild.roles.highest.position && interaction.user.id !== foundTicket.creatorID) {
            interaction.reply((0, GenUtils_1.errorEmbed)("You do not have permission to remove a user from this ticket."));
            return;
        }
    }
    await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false });
    const users = foundTicket.users;
    const usersIndex = users.indexOf(user.id);
    if (usersIndex > -1) {
        users.splice(usersIndex, 1);
    }
    await foundTicket.updateOne({
        users: users
    });
    interaction.reply({ content: `<@${user.id}> has been removed to from ticket.` });
});
