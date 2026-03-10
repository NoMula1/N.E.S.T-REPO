"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const config_1 = require("../../../utils/config");
const PostTemplates_1 = __importDefault(require("../../../schemas/PostTemplates"));
const GlobalScope_1 = require("../../../bootstrap/GlobalScope");
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("adminping")
    .setDescription("Get NEST Admin's latency and Discord API latency.")
    .setBasePermission({
    Scope: GlobalScope_1.Scope.Admin,
    Level: CommandExecutor_1.PermissionLevel.None,
})
    .setExecutor(async (interaction) => {
    const resultMessage = await interaction.reply({ content: "🔃 Calculating...", fetchReply: true });
    const ping = resultMessage.createdTimestamp - interaction.createdTimestamp;
    const before = Date.now();
    await PostTemplates_1.default.findOne({
        approved: true
    });
    const after = Date.now();
    const dbQueryLatency = after - before;
    const replyMessage = `${config_1.config.successEmoji} Bot Latency Info\n- Bot Latency: **${ping}ms**\n- Websocket Latency: **${interaction.client.ws.ping}ms**`
        + `\n- DB Query Latency: **${Math.round(dbQueryLatency)}ms**`;
    interaction.editReply({ content: replyMessage });
});
