"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const config_1 = require("../../../utils/config");
const GuildConfigCache_1 = require("../../../utils/GuildConfigCache");
const GuildConfig_1 = __importDefault(require("../../../schemas/GuildConfig"));
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName('setup')
    .setDescription('Link this server to the NightHawk dashboard and generate a setup token.')
    // Permission level None — we do a combined dev + Discord Administrator check inside the executor.
    .setBasePermission({ Level: CommandExecutor_1.PermissionLevel.None })
    .setExecutor(async (interaction) => {
    var _a, _b, _c, _d, _e;
    if (!interaction.inCachedGuild()) {
        await interaction.reply({ content: 'You must use this command inside a guild.', ephemeral: true });
        return;
    }
    // Allow NEST developers OR users with Discord Administrator permission.
    const isDev = config_1.config.devs.includes(interaction.user.id);
    const isDiscordAdmin = (_b = (_a = interaction.memberPermissions) === null || _a === void 0 ? void 0 : _a.has(discord_js_1.PermissionsBitField.Flags.Administrator)) !== null && _b !== void 0 ? _b : false;
    if (!isDev && !isDiscordAdmin) {
        await interaction.reply({
            content: 'You must be a NEST developer or a server Administrator to use this command.',
            ephemeral: true,
        });
        return;
    }
    const guildId = interaction.guildId;
    const guildName = interaction.guild.name;
    // Ensure a config document exists
    await (0, GuildConfigCache_1.getOrCreateGuildConfig)(guildId, guildName);
    // Generate a one-time 32-char hex token
    const linkToken = crypto_1.default.randomBytes(16).toString('hex');
    const linkTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h from now
    await GuildConfig_1.default.updateOne({ guildId }, { $set: { linkToken, linkTokenExpires } });
    // Bust cache so next read picks up the new token
    (0, GuildConfigCache_1.invalidateGuildConfig)(guildId);
    // Fetch updated doc to show current linked status
    const updatedConfig = await GuildConfig_1.default.findOne({ guildId }).lean();
    const linked = (_c = updatedConfig === null || updatedConfig === void 0 ? void 0 : updatedConfig.linked) !== null && _c !== void 0 ? _c : false;
    const portalBase = (_e = (_d = process.env.PORTAL_URL) === null || _d === void 0 ? void 0 : _d.replace(/\/$/, '')) !== null && _e !== void 0 ? _e : 'https://nighthawkorg-production.up.railway.app';
    const setupUrl = `${portalBase}/member/nest/setup?token=${linkToken}&guild=${guildId}`;
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle('NEST Server Setup')
        .setColor('Blurple')
        .addFields({ name: 'Guild', value: `${guildName} (\`${guildId}\`)`, inline: false }, { name: 'Linked', value: linked ? 'Yes' : 'No', inline: true }, { name: 'Setup Link', value: `[Click here to finish setup](${setupUrl})`, inline: false })
        .setDescription('Visit the link above to finish linking this server to the NightHawk dashboard. ' +
        'The link expires in **24 hours**.')
        .setFooter({ text: 'Do not share this link — it grants access to link your server.' })
        .setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
});
