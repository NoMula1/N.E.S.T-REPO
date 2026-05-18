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
var _ContextCommandExecutor_executor, _ContextCommandExecutor_base_permission;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserContextCommandExecutor = exports.MessageContextCommandExecutor = exports.ContextCommandExecutor = void 0;
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("./CommandExecutor");
const config_1 = require("../utils/config");
const GuildConfigCache_1 = require("../utils/GuildConfigCache");
const LEVEL_ROLE_MAP = {
    [CommandExecutor_1.PermissionLevel.MarketStaff]: { key: 'MarketStaff', message: 'You must be Trial Market Moderator and up to use this command.' },
    [CommandExecutor_1.PermissionLevel.TrialHelpModerator]: { key: 'TrialHelpModerator', message: 'You must be Trial Help Moderator and up to use this command.' },
    [CommandExecutor_1.PermissionLevel.HelpModerator]: { key: 'HelpModerator', message: 'You must be Help Moderator and up to use this command.' },
    [CommandExecutor_1.PermissionLevel.MarketModerator]: { key: 'MarketModerator', message: 'You must be Market Moderator and up to use this command.' },
    [CommandExecutor_1.PermissionLevel.HelpManager]: { key: 'HelpManager', message: 'You must be Help Manager and up to use this command.' },
    [CommandExecutor_1.PermissionLevel.AssistantModerator]: { key: 'AssistantModerator', message: 'You must be Assistant Moderator and up to use this command.' },
    [CommandExecutor_1.PermissionLevel.Moderator]: { key: 'Moderator', message: 'You must be Moderator and up to use this command.' },
    [CommandExecutor_1.PermissionLevel.SeniorModerator]: { key: 'SeniorModerator', message: 'You must be Senior Moderator and up to use this command.' },
    [CommandExecutor_1.PermissionLevel.SeniorMarketModerator]: { key: 'SeniorMarketModerator', message: 'You must be Senior Market Moderator and up to use this command.' },
    [CommandExecutor_1.PermissionLevel.AssistantAdministrator]: { key: 'AssistantAdministrator', message: 'You must be Assistant Administrator and up to use this command.' },
    [CommandExecutor_1.PermissionLevel.MarketManager]: { key: 'MarketManager', message: 'You must be Market Manager and up to use this command.' },
    [CommandExecutor_1.PermissionLevel.Administrator]: { key: 'Administrator', message: 'You must be Administrator and up to use this command.' },
};
class ContextCommandExecutor extends discord_js_1.ContextMenuCommandBuilder {
    constructor() {
        super();
        _ContextCommandExecutor_executor.set(this, void 0);
        _ContextCommandExecutor_base_permission.set(this, void 0);
        __classPrivateFieldSet(this, _ContextCommandExecutor_executor, function () {
            throw new Error('Command executor unimplemented (call setExecutor before exporting commands)');
        }, "f");
        __classPrivateFieldSet(this, _ContextCommandExecutor_base_permission, { Level: CommandExecutor_1.PermissionLevel.None }, "f");
    }
    /**
     * Sets the {@link executor}.
     * @param executor The actual executor.
     * @returns {NESTCommand}
    */
    setExecutor(executor) {
        __classPrivateFieldSet(this, _ContextCommandExecutor_executor, executor, "f");
        return this;
    }
    /** Sets the base permissions that will always apply to the command. */
    setBasePermission(permission) {
        __classPrivateFieldSet(this, _ContextCommandExecutor_base_permission, permission, "f");
        return this;
    }
    /**
     * Checks if the user has permission to run this command.
     * @param {Interaction} interaction
     * @returns The result of checking if the user has permission to run the command.
     */
    async hasPermission(interaction) {
        var _a, _b, _c, _d;
        if (!interaction.inCachedGuild())
            return { success: false, content: "You must use this in a guild." };
        if (!((_b = (_a = interaction.member) === null || _a === void 0 ? void 0 : _a.permissions) === null || _b === void 0 ? void 0 : _b.has([
            discord_js_1.PermissionsBitField.Flags.SendMessages,
            discord_js_1.PermissionsBitField.Flags.EmbedLinks
        ]))) {
            return {
                success: false
            };
        }
        if (!__classPrivateFieldGet(this, _ContextCommandExecutor_base_permission, "f").NotRole)
            __classPrivateFieldGet(this, _ContextCommandExecutor_base_permission, "f").NotRole = [];
        if (!__classPrivateFieldGet(this, _ContextCommandExecutor_base_permission, "f").NotUser)
            __classPrivateFieldGet(this, _ContextCommandExecutor_base_permission, "f").NotUser = [];
        if (!__classPrivateFieldGet(this, _ContextCommandExecutor_base_permission, "f").HasRole)
            __classPrivateFieldGet(this, _ContextCommandExecutor_base_permission, "f").HasRole = [];
        if (!__classPrivateFieldGet(this, _ContextCommandExecutor_base_permission, "f").IsUser)
            __classPrivateFieldGet(this, _ContextCommandExecutor_base_permission, "f").IsUser = [];
        for (const user of __classPrivateFieldGet(this, _ContextCommandExecutor_base_permission, "f").NotUser) {
            if (interaction.user.id === user) {
                return {
                    success: false,
                    content: "You are not allowed to run this command."
                };
            }
        }
        for (const role of __classPrivateFieldGet(this, _ContextCommandExecutor_base_permission, "f").NotRole) {
            if (interaction.member.roles.cache.has(role)) {
                return {
                    success: false,
                    content: "You are not allowed to run this command."
                };
            }
        }
        for (const role of __classPrivateFieldGet(this, _ContextCommandExecutor_base_permission, "f").HasRole) {
            if (interaction.member.roles.cache.has(role)) {
                return {
                    success: true
                };
            }
        }
        for (const user of __classPrivateFieldGet(this, _ContextCommandExecutor_base_permission, "f").IsUser) {
            if (interaction.user.id === user) {
                return {
                    success: true
                };
            }
        }
        const level = __classPrivateFieldGet(this, _ContextCommandExecutor_base_permission, "f").Level;
        if (level === CommandExecutor_1.PermissionLevel.None)
            return { success: true };
        // Developers bypass all role-level checks
        if (config_1.config.devs.includes(interaction.user.id))
            return { success: true };
        if (level === CommandExecutor_1.PermissionLevel.Developer) {
            return { success: false, content: 'You must be a NEST developer to use this command.' };
        }
        // Discord Administrators bypass NEST role checks
        if ((_c = interaction.memberPermissions) === null || _c === void 0 ? void 0 : _c.has('Administrator'))
            return { success: true };
        const mapping = LEVEL_ROLE_MAP[level];
        if (!mapping)
            return { success: false, content: "You aren't authorized to use this command." };
        const guildConfig = await (0, GuildConfigCache_1.getGuildConfig)(interaction.guildId);
        const roleId = (_d = guildConfig === null || guildConfig === void 0 ? void 0 : guildConfig.roles) === null || _d === void 0 ? void 0 : _d[mapping.key];
        if (!roleId)
            return { success: false, content: `This server hasn't configured the ${mapping.key} role yet. Run /setup or configure roles in the NEST dashboard.` };
        if (!interaction.member.roles.cache.has(roleId))
            return { success: false, content: mapping.message };
        return { success: true };
    }
    /** Runs the current {@link Executor}. */
    execute(interaction) {
        var _a;
        return (_a = __classPrivateFieldGet(this, _ContextCommandExecutor_executor, "f").call(this, interaction)) !== null && _a !== void 0 ? _a : Promise.resolve();
    }
}
exports.ContextCommandExecutor = ContextCommandExecutor;
_ContextCommandExecutor_executor = new WeakMap(), _ContextCommandExecutor_base_permission = new WeakMap();
class MessageContextCommandExecutor extends ContextCommandExecutor {
    constructor() {
        super();
        this.setType(discord_js_1.ApplicationCommandType.Message);
    }
}
exports.MessageContextCommandExecutor = MessageContextCommandExecutor;
class UserContextCommandExecutor extends ContextCommandExecutor {
    constructor() {
        super();
        this.setType(discord_js_1.ApplicationCommandType.User);
    }
}
exports.UserContextCommandExecutor = UserContextCommandExecutor;
