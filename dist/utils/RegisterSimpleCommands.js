"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.load = load;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logging_1 = require("../utils/logging");
const GenUtils_1 = require("../utils/GenUtils");
const GlobalScope_1 = require("../bootstrap/GlobalScope");
const SimpleCommandExecutor_1 = require("./SimpleCommandExecutor");
async function load(client) {
    return;
    //SIMPLE COMMANDS
    const commandPath = path_1.default.join(__dirname, "..", "commands", "simple");
    const commandFiles = fs_1.default.readdirSync(commandPath);
    for (const commandFile of commandFiles) {
        if (!commandFile.endsWith('.md'))
            continue;
        const command = new SimpleCommandExecutor_1.SimpleCommand(commandFile.substring(0, commandFile.indexOf('.')), fs_1.default.readFileSync(`${commandPath}/${commandFile}`, 'utf-8'));
        await new Promise((resolve) => setTimeout(resolve, 10)); // delay
        if (command.scope !== GlobalScope_1.scope)
            continue;
        logging_1.Log.debug(`[Get] | Simple Command | ${commandFile}`);
        client.simplecommands.set(command.name, command);
        logging_1.Log.debug(`[Loaded]  | Simple Command | ${command.name}`);
    }
    client.on("interactionCreate", async (interaction) => {
        if (!interaction.isChatInputCommand())
            return;
        const command = client.simplecommands.get(interaction.commandName);
        if (!command)
            return;
        if (command.scope !== GlobalScope_1.scope)
            return;
        try {
            // TODO: Define permissions for simple commands
            if (false) {
                // TODO: Warn the user
                //await interaction.reply({ content: permResult.content || "You are not authorized to execute this command.", ephemeral: true });
                return;
            }
            await command.executeInteraction(interaction);
        }
        catch (error) {
            logging_1.Log.error(error);
            await interaction
                .reply({ content: 'There was an error while executing this simple command!' })
                .catch((err) => (0, GenUtils_1.handleError)(err));
        }
    });
    client.on('messageCreate', async (message) => {
        var _a, _b;
        if (!message.content.startsWith(';'))
            return;
        // todo: This, ugly! Need to refactor
        // Based on: https://stackoverflow.com/a/46946420
        // Licensed under CC BY-SA 3.0
        const args = (_b = ((_a = message.content.substring(1)) !== null && _a !== void 0 ? _a : '')
            .match(/\\?.|^$/g)) === null || _b === void 0 ? void 0 : _b.reduce((p, c) => {
            if (c === '"')
                p.quote ^= 1;
            else if (!p.quote && c === ' ')
                p.a.push('');
            else
                p.a[p.a.length - 1] += c.replace(/\\(.)/, '$1');
            return p;
        }, { a: [''] }).a;
        const command = client.simplecommands.get(args[0]);
        if (!command)
            return;
        if (command.scope !== GlobalScope_1.scope)
            return;
        try {
            // TODO: Define permissions for simple commands
            if (false) {
                // TODO: Warn the user
                //await message.reply({ content: permResult.content || "You are not authorized to execute this command.", ephemeral: true });
                return;
            }
            await command.executeMessage(message, args);
        }
        catch (error) {
            logging_1.Log.error(error);
            await message
                .reply({ content: 'There was an error while executing this simple command!' })
                .catch((err) => (0, GenUtils_1.handleError)(err));
        }
    });
}
