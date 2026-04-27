"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const node_child_process_1 = require("node:child_process");
const os = __importStar(require("os"));
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const config_1 = require("../../../utils/config");
function formatDuration(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
}
function truncate(text, maxLength) {
    return text.length > maxLength ? `${text.slice(0, maxLength - 12)}\n\n*Output truncated...*` : text;
}
function parseErrorEntries(stdout) {
    const lines = stdout.split(/\r?\n/);
    const entries = [];
    let currentEntry = [];
    for (const line of lines) {
        if (line.includes("[ERROR]")) {
            if (currentEntry.length > 0) {
                entries.push(currentEntry.join("\n"));
            }
            currentEntry = [line];
        }
        else if (currentEntry.length > 0) {
            currentEntry.push(line);
        }
    }
    if (currentEntry.length > 0) {
        entries.push(currentEntry.join("\n"));
    }
    return entries.reverse();
}
function buildInfoEmbed(interaction) {
    const memoryUsage = process.memoryUsage();
    const totalSystemMemory = os.totalmem();
    const freeSystemMemory = os.freemem();
    const loadAverage = os.loadavg().map(value => value.toFixed(2)).join(" / ");
    const botUptime = formatDuration(process.uptime());
    const systemUptime = formatDuration(os.uptime());
    const cpu = os.cpus()[0];
    const guildCount = interaction.client.guilds.cache.size;
    const cachedUsers = interaction.client.users.cache.size;
    return new discord_js_1.EmbedBuilder()
        .setTitle("Bot & System Information")
        .setColor("Blue")
        .addFields({
        name: "Bot Statistics",
        value: `**WS Latency:** ${interaction.client.ws.ping}ms\n` +
            `**Guilds Cached:** ${guildCount}\n` +
            `**Users Cached:** ${cachedUsers}\n` +
            `**Process Uptime:** ${botUptime}\n` +
            `**Node Version:** ${process.version}`,
        inline: false
    }, {
        name: "System Information",
        value: `**OS:** ${os.type()} ${os.release()} (${os.arch()})\n` +
            `**CPU:** ${cpu.model} (${os.cpus().length} cores)\n` +
            `**System Uptime:** ${systemUptime}\n` +
            `**Load Average:** ${loadAverage}`,
        inline: false
    }, {
        name: "Memory Usage",
        value: `**Process RSS:** ${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB\n` +
            `**Heap Used:** ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB\n` +
            `**Heap Total:** ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB\n` +
            `**System Memory:** ${(totalSystemMemory / 1024 / 1024 / 1024).toFixed(2)} GB\n` +
            `**Free Memory:** ${(freeSystemMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
        inline: false
    })
        .setFooter({ text: `Requested by ${interaction.user.tag}` });
}
function buildErrorEmbed(entry, index, total) {
    return new discord_js_1.EmbedBuilder()
        .setTitle("Bot Error Viewer")
        .setColor("Red")
        .setDescription(truncate(entry, 3900))
        .setFooter({ text: `Page ${index + 1}/${total}` });
}
function buildOpenRow() {
    return new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId("info_errors_open")
        .setLabel("View Bot Errors")
        .setStyle(discord_js_1.ButtonStyle.Secondary));
}
function buildErrorNavRow(page, total) {
    return new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId("info_errors_back")
        .setLabel("Back to Info")
        .setStyle(discord_js_1.ButtonStyle.Danger), new discord_js_1.ButtonBuilder()
        .setCustomId("info_errors_prev")
        .setLabel("Previous")
        .setStyle(discord_js_1.ButtonStyle.Primary)
        .setDisabled(page === 0), new discord_js_1.ButtonBuilder()
        .setCustomId("info_errors_next")
        .setLabel("Next")
        .setStyle(discord_js_1.ButtonStyle.Primary)
        .setDisabled(page === total - 1));
}
function execLogs(command) {
    return new Promise((resolve, reject) => {
        (0, node_child_process_1.exec)(command, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(stdout);
        });
    });
}
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("info")
    .setDescription("Show information and statistics about the bot and the machine it is running on.")
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.None,
})
    .setExecutor(async (interaction) => {
    const isDeveloper = config_1.config.devs.includes(interaction.user.id);
    const infoEmbed = buildInfoEmbed(interaction);
    const sentMessage = await interaction.reply({ embeds: [infoEmbed], components: isDeveloper ? [buildOpenRow()] : [], fetchReply: true });
    if (!isDeveloper)
        return;
    let errorEntries = [];
    let currentPage = 0;
    let showingErrors = false;
    const replyMessage = sentMessage;
    const collector = replyMessage.createMessageComponentCollector({ time: 120000 });
    collector.on("collect", async (buttonInteraction) => {
        if (!config_1.config.devs.includes(buttonInteraction.user.id)) {
            buttonInteraction.reply({ content: "This feature is only available to NEST developers.", ephemeral: true });
            return;
        }
        await buttonInteraction.deferUpdate();
        switch (buttonInteraction.customId) {
            case "info_errors_open": {
                if (!showingErrors) {
                    const command = process.platform === "linux" ? "pm2 logs Core --nostream --lines=1000" : "npx pm2 logs Core --nostream --lines=1000";
                    let stdout;
                    try {
                        stdout = await execLogs(command);
                    }
                    catch (error) {
                        buttonInteraction.followUp({ content: `Unable to read bot logs: ${error}`, ephemeral: true });
                        return;
                    }
                    errorEntries = parseErrorEntries(stdout);
                    if (errorEntries.length === 0) {
                        buttonInteraction.followUp({ content: "No recent bot error entries were found.", ephemeral: true });
                        return;
                    }
                    showingErrors = true;
                    currentPage = 0;
                    const errorEmbed = buildErrorEmbed(errorEntries[currentPage], currentPage, errorEntries.length);
                    const navRow = buildErrorNavRow(currentPage, errorEntries.length);
                    replyMessage.edit({ embeds: [errorEmbed], components: [navRow] });
                }
                break;
            }
            case "info_errors_prev": {
                if (!showingErrors || currentPage === 0)
                    return;
                currentPage -= 1;
                const pageEmbed = buildErrorEmbed(errorEntries[currentPage], currentPage, errorEntries.length);
                const navRow = buildErrorNavRow(currentPage, errorEntries.length);
                replyMessage.edit({ embeds: [pageEmbed], components: [navRow] });
                break;
            }
            case "info_errors_next": {
                if (!showingErrors || currentPage >= errorEntries.length - 1)
                    return;
                currentPage += 1;
                const pageEmbed = buildErrorEmbed(errorEntries[currentPage], currentPage, errorEntries.length);
                const navRow = buildErrorNavRow(currentPage, errorEntries.length);
                replyMessage.edit({ embeds: [pageEmbed], components: [navRow] });
                break;
            }
            case "info_errors_back": {
                showingErrors = false;
                const navRow = buildOpenRow();
                replyMessage.edit({ embeds: [infoEmbed], components: [navRow] });
                break;
            }
        }
    });
    collector.on("end", async () => {
        const row = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId("info_errors_open")
            .setLabel("View Bot Errors")
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setDisabled(true));
        try {
            replyMessage.edit({ components: [row] });
        }
        catch (_a) {
            // ignore edit failures after collector ends
        }
    });
});
