"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _SimpleCommand_text;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleCommand = void 0;
const discord_js_1 = require("discord.js");
const GlobalScope_1 = require("../bootstrap/GlobalScope");
const yamlMarkdown_1 = require("../utils/yamlMarkdown");
const mentionsTag = '%mentions%';
class SimpleCommand extends discord_js_1.SlashCommandBuilder {
    constructor(name, contents) {
        var _a, _b;
        super();
        /** The raw command text. */
        _SimpleCommand_text.set(this, void 0);
        const parser = new yamlMarkdown_1.YamlMarkdown(contents);
        this.setName(name);
        if (parser.yaml.has('description'))
            this.setDescription(parser.yaml.get('description'));
        __classPrivateFieldSet(this, _SimpleCommand_text, parser.markdown, "f");
        this.reply = (_a = parser.yaml.get('reply')) !== null && _a !== void 0 ? _a : true;
        this.scope = (0, GlobalScope_1.fromString)((_b = parser.yaml.get('scope')) !== null && _b !== void 0 ? _b : '');
        if (this.hasMentions)
            this.addUserOption(opt => opt.setName('user')
                .setDescription('User to mention'));
    }
    /** The formatted command text. */
    getText(mentions = '') {
        return __classPrivateFieldGet(this, _SimpleCommand_text, "f")
            .replace(mentionsTag, mentions);
    }
    get hasMentions() {
        return __classPrivateFieldGet(this, _SimpleCommand_text, "f").includes(mentionsTag);
    }
    async executeInteraction(interaction) {
        const user = interaction.options.getUser('user');
        const output = this.getText(user !== null ? (0, discord_js_1.userMention)(user.id) : '');
        await this.execute(interaction, output);
    }
    async executeMessage(message, args) {
        let mentions = '';
        if (this.hasMentions)
            mentions = this.toMention(args[1]);
        const output = this.getText(mentions);
        await this.execute(message, output);
    }
    async execute(interaction, output) {
        var _a;
        if (this.reply)
            await interaction.reply(output);
        else
            await ((_a = interaction.channel) === null || _a === void 0 ? void 0 : _a.send(output));
    }
    /**
     * Detects and formats a user mention.
     * @param arg A raw user argument.
     * @returns A formatted user mention or an empty string.
     */
    toMention(arg) {
        if (!arg)
            return '';
        else if (arg.match(/^[0-9]+$/) !== null)
            return `<@${arg}>`;
        else if (arg.match(discord_js_1.MessageMentions.UsersPattern) !== null)
            return arg;
        else
            return '';
    }
    toJSON() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const json = super.toJSON();
        delete json.text;
        delete json.reply;
        delete json.scope;
        return json;
    }
}
exports.SimpleCommand = SimpleCommand;
_SimpleCommand_text = new WeakMap();
