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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.load = load;
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logging_1 = require("../utils/logging");
const GenUtils_1 = require("../utils/GenUtils");
const Settings_1 = __importDefault(require("../schemas/Settings"));
const GlobalScope_1 = require("../bootstrap/GlobalScope");
dotenv_1.default.config();
async function load(client) {
    var _a, _b;
    const fileExt = __filename.endsWith('.ts') ? '.ts' : '.js';
    //SLASH COMMANDS
    const commandPath = path_1.default.join(__dirname, "..", "commands", "slash");
    const commandFolders = fs_1.default.readdirSync(commandPath);
    for (const folder of commandFolders) {
        const commandFiles = fs_1.default.readdirSync(`${commandPath}/${folder}`).filter(file => file.endsWith(fileExt));
        for (const file of commandFiles) {
            const command = (_a = (await Promise.resolve(`${`${commandPath}/${folder}/${file}`}`).then(s => __importStar(require(s))).catch(err => {
                logging_1.Log.error(`[Error] | Slash Command | ${file} | Unable to import: ${err}`);
                return null;
            }))) === null || _a === void 0 ? void 0 : _a.default;
            await new Promise((resolve) => setTimeout(resolve, 10)); // delay
            if (!command)
                continue;
            if (command.scope !== GlobalScope_1.scope)
                continue;
            //Log.debug(`[Get] | Slash Command | ${file}`);
            client.slashcommands.set(command.name, command);
            //Log.debug(`[Loaded]  | Slash Command | ${file}`);
        }
    }
    //CONTEXT COMMANDS
    const contextPath = path_1.default.join(__dirname, "..", "commands", "context");
    const contextFolders = fs_1.default.readdirSync(contextPath);
    for (const folder of contextFolders) {
        const commandFiles = fs_1.default.readdirSync(`${contextPath}/${folder}`).filter(file => file.endsWith(fileExt));
        for (const file of commandFiles) {
            const command = (_b = (await Promise.resolve(`${`${contextPath}/${folder}/${file}`}`).then(s => __importStar(require(s))).catch(err => {
                logging_1.Log.error(`[Error] | Slash Command | ${file} | Unable to import: ${err}`);
                return null;
            }))) === null || _b === void 0 ? void 0 : _b.default;
            await new Promise((resolve) => setTimeout(resolve, 10)); // delay
            if (!command)
                continue;
            if (command.scope !== GlobalScope_1.scope)
                continue;
            //Log.debug(`[Get] | Context Command | ${file}`);
            client.contextcommands.set(command.name, command);
            //Log.debug(`[Loaded]  | Context Command | ${file}`);
        }
    }
    client.on("interactionCreate", async (interaction) => {
        var _a, _b, _c;
        if (interaction.isChatInputCommand()) {
            const command = client.slashcommands.get(interaction.commandName);
            if (interaction.inCachedGuild()) {
                const settings = await Settings_1.default.findOne({
                    guildID: (_a = interaction.guild) === null || _a === void 0 ? void 0 : _a.id
                });
                if (!settings) {
                    await (0, GenUtils_1.createNewGuildFile)(interaction.guild);
                }
            }
            logging_1.Log.debug(`${(_c = (_b = interaction.guild) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : "non-guild"} > ${interaction.user.username} > /${interaction.commandName} ${interaction.options.data.map((option) => { return `${option.name} [${discord_js_1.ApplicationCommandOptionType[option.type]}]: ${option.value}`; })}`);
            if (!command)
                return;
            try {
                const permResult = await command.hasPermission(interaction);
                if (permResult.success == false) {
                    await interaction.reply({ content: permResult.content || "You are not authorized to execute this command.", ephemeral: true });
                    return;
                }
                await command.execute(interaction);
            }
            catch (error) {
                console.error(error);
                await interaction
                    .reply({ content: 'There was an error while executing this command!', ephemeral: true })
                    .catch((err) => (0, GenUtils_1.handleError)(err));
            }
        }
        else if (interaction.isContextMenuCommand()) {
            const command = client.contextcommands.get(interaction.commandName);
            if (!command)
                return;
            try {
                const permResult = await command.hasPermission(interaction);
                if (permResult.success == false) {
                    await interaction.reply({ content: permResult.content || "You are not authorized to execute this command.", ephemeral: true });
                    return;
                }
                await command.execute(interaction);
            }
            catch (error) {
                console.error(error);
                await interaction
                    .reply({ content: 'There was an error while executing this command!', ephemeral: true })
                    .catch((err) => (0, GenUtils_1.handleError)(err));
            }
        }
    });
}
