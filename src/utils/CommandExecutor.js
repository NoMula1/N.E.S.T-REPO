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
var _CommandExecutor_executor, _CommandExecutor_base_permission, _CommandExecutor_disabled;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandExecutor = exports.PermissionLevel = void 0;
const discord_js_1 = require("discord.js");
const config_1 = require("../utils/config");
const GuildConfigCache_1 = require("../utils/GuildConfigCache");
/**
 * Permission level for commands.
 * @enum {PermissionLevel} Level for command use.
 */
var PermissionLevel;
(function (PermissionLevel) {
    /** No permission required to use the command. */
    PermissionLevel[PermissionLevel["None"] = 0] = "None";
    /** Requires the Trial Market Moderator role. */
    PermissionLevel[PermissionLevel["MarketStaff"] = 1] = "MarketStaff";
    /** Requires the Trial Help Moderator Role */
    PermissionLevel[PermissionLevel["TrialHelpModerator"] = 2] = "TrialHelpModerator";
    /** Requires the Help Moderator role. */
    PermissionLevel[PermissionLevel["HelpModerator"] = 3] = "HelpModerator";
    /** Requires the Market Moderator role. */
    PermissionLevel[PermissionLevel["MarketModerator"] = 4] = "MarketModerator";
    /** Requires the Help Manager role. */
    PermissionLevel[PermissionLevel["HelpManager"] = 5] = "HelpManager";
    /** Requires the Assistant Moderator role. */
    PermissionLevel[PermissionLevel["AssistantModerator"] = 6] = "AssistantModerator";
    /** Requires the Moderator role. */
    PermissionLevel[PermissionLevel["Moderator"] = 7] = "Moderator";
    /** Requires the Senior Moderator role. */
    PermissionLevel[PermissionLevel["SeniorModerator"] = 8] = "SeniorModerator";
    /** Requires the Senior Market Moderator role. */
    PermissionLevel[PermissionLevel["SeniorMarketModerator"] = 9] = "SeniorMarketModerator";
    /** Requires the Assistant Administrator role. */
    PermissionLevel[PermissionLevel["AssistantAdministrator"] = 10] = "AssistantAdministrator";
    /** Requires the Market Manager role. */
    PermissionLevel[PermissionLevel["MarketManager"] = 11] = "MarketManager";
    /** Requires the Administrator role. */
    PermissionLevel[PermissionLevel["Administrator"] = 12] = "Administrator";
    /** Must be a part of the devs array in config.json. */
    PermissionLevel[PermissionLevel["Developer"] = 13] = "Developer";
})(PermissionLevel || (exports.PermissionLevel = PermissionLevel = {}));
const LEVEL_ROLE_MAP = {
    [PermissionLevel.MarketStaff]: { key: 'MarketStaff', message: 'You must be Trial Market Moderator and up to use this command.' },
    [PermissionLevel.TrialHelpModerator]: { key: 'TrialHelpModerator', message: 'You must be Trial Help Moderator and up to use this command.' },
    [PermissionLevel.HelpModerator]: { key: 'HelpModerator', message: 'You must be Help Moderator and up to use this command.' },
    [PermissionLevel.MarketModerator]: { key: 'MarketModerator', message: 'You must be Market Moderator and up to use this command.' },
    [PermissionLevel.HelpManager]: { key: 'HelpManager', message: 'You must be Help Manager and up to use this command.' },
    [PermissionLevel.AssistantModerator]: { key: 'AssistantModerator', message: 'You must be Assistant Moderator and up to use this command.' },
    [PermissionLevel.Moderator]: { key: 'Moderator', message: 'You must be Moderator and up to use this command.' },
    [PermissionLevel.SeniorModerator]: { key: 'SeniorModerator', message: 'You must be Senior Moderator and up to use this command.' },
    [PermissionLevel.SeniorMarketModerator]: { key: 'SeniorMarketModerator', message: 'You must be Senior Market Moderator and up to use this command.' },
    [PermissionLevel.AssistantAdministrator]: { key: 'AssistantAdministrator', message: 'You must be Assistant Administrator and up to use this command.' },
    [PermissionLevel.MarketManager]: { key: 'MarketManager', message: 'You must be Market Manager and up to use this command.' },
    [PermissionLevel.Administrator]: { key: 'Administrator', message: 'You must be Administrator and up to use this command.' },
};
/** A user-facing command. */
class CommandExecutor extends discord_js_1.SlashCommandBuilder {
    constructor() {
        super();
        _CommandExecutor_executor.set(this, void 0);
        _CommandExecutor_base_permission.set(this, void 0);
        _CommandExecutor_disabled.set(this, void 0);
        __classPrivateFieldSet(this, _CommandExecutor_executor, function () {
            throw new Error('Command executor unimplemented (call setExecutor before exporting commands)');
        }, "f");
        __classPrivateFieldSet(this, _CommandExecutor_base_permission, { Level: PermissionLevel.None }, "f");
        __classPrivateFieldSet(this, _CommandExecutor_disabled, false, "f");
    }
    /**
     * Sets the {@link executor}.
     * @param executor The actual executor.
     * @returns {NESTCommand}
    */
    setExecutor(executor) {
        __classPrivateFieldSet(this, _CommandExecutor_executor, executor, "f");
        return this;
    }
    /* Sets whether or not the command is disabled or not*/
    setDisabled(disabled) {
        __classPrivateFieldSet(this, _CommandExecutor_disabled, disabled, "f");
        return this;
    }
    /** Sets the base permissions that will always apply to the command. */
    setBasePermission(permission) {
        __classPrivateFieldSet(this, _CommandExecutor_base_permission, permission, "f");
        return this;
    }
    /**
     * Sets the name of the command
     *
     * @param name - The name of the command
     */
    setName(name) {
        super.setName(name);
        return this;
    }
    /**
     * Sets the description of the command
     *
     * @param description - The description of the command
     */
    setDescription(description) {
        super.setDescription(description);
        return this;
    }
    /**
     * Adds a string option.
     *
     * @param input - A function that returns an option builder or an already built builder
     */
    addStringOption(input) {
        super.addStringOption(input);
        return this;
    }
    /**
     * Adds a boolean option.
     *
     * @param input - A function that returns an option builder or an already built builder
     */
    addBooleanOption(input) {
        super.addBooleanOption(input);
        return this;
    }
    /**
     * Adds a user option.
     *
     * @param input - A function that returns an option builder or an already built builder
     */
    addUserOption(input) {
        super.addUserOption(input);
        return this;
    }
    /**
     * Adds a role option.
     *
     * @param input - A function that returns an option builder or an already built builder
     */
    addRoleOption(input) {
        super.addRoleOption(input);
        return this;
    }
    /**
     * Adds an integer option.
     *
     * @param input - A function that returns an option builder or an already built builder
     */
    addIntegerOption(input) {
        super.addIntegerOption(input);
        return this;
    }
    ;
    /**
     * Adds a number option.
     *
     * @param input - A function that returns an option builder or an already built builder
     */
    addNumberOption(input) {
        super.addNumberOption(input);
        return this;
    }
    ;
    /**
     * Adds a channel option.
     *
     * @param input - A function that returns an option builder or an already built builder
     */
    addChannelOption(input) {
        super.addChannelOption(input);
        return this;
    }
    ;
    /**
     * Checks if the user has permission to run this command.
     * @param {Interaction} interaction
     * @returns The result of checking if the user has permission to run the command.
     */
    async hasPermission(interaction) {
        var _a, _b;
        if (!interaction.inCachedGuild())
            return { success: false, content: "You must use this in a guild." };
        if (!__classPrivateFieldGet(this, _CommandExecutor_base_permission, "f").NotRole)
            __classPrivateFieldGet(this, _CommandExecutor_base_permission, "f").NotRole = [];
        if (!__classPrivateFieldGet(this, _CommandExecutor_base_permission, "f").NotUser)
            __classPrivateFieldGet(this, _CommandExecutor_base_permission, "f").NotUser = [];
        if (!__classPrivateFieldGet(this, _CommandExecutor_base_permission, "f").HasRole)
            __classPrivateFieldGet(this, _CommandExecutor_base_permission, "f").HasRole = [];
        if (!__classPrivateFieldGet(this, _CommandExecutor_base_permission, "f").IsUser)
            __classPrivateFieldGet(this, _CommandExecutor_base_permission, "f").IsUser = [];
        if (this.disabled) {
            return {
                success: false,
                content: `This command has been disabled. Please contact a Bot Developer if you believe this is an error.`
            };
        }
        for (const user of __classPrivateFieldGet(this, _CommandExecutor_base_permission, "f").NotUser) {
            if (interaction.user.id === user) {
                return {
                    success: false,
                    content: "You are not allowed to run this command."
                };
            }
        }
        for (const role of __classPrivateFieldGet(this, _CommandExecutor_base_permission, "f").NotRole) {
            if (interaction.member.roles.cache.has(role)) {
                return {
                    success: false,
                    content: "You are not allowed to run this command."
                };
            }
        }
        for (const role of __classPrivateFieldGet(this, _CommandExecutor_base_permission, "f").HasRole) {
            if (interaction.member.roles.cache.has(role)) {
                return {
                    success: true
                };
            }
        }
        for (const user of __classPrivateFieldGet(this, _CommandExecutor_base_permission, "f").IsUser) {
            if (interaction.user.id === user) {
                return {
                    success: true
                };
            }
        }
        const level = __classPrivateFieldGet(this, _CommandExecutor_base_permission, "f").Level;
        if (level === PermissionLevel.None)
            return { success: true };
        // Developers bypass all role-level checks
        if (config_1.config.devs.includes(interaction.user.id))
            return { success: true };
        if (level === PermissionLevel.Developer) {
            return { success: false, content: 'You must be a NEST developer to use this command.' };
        }
        // Discord Administrators bypass NEST role checks
        if ((_a = interaction.memberPermissions) === null || _a === void 0 ? void 0 : _a.has('Administrator'))
            return { success: true };
        const mapping = LEVEL_ROLE_MAP[level];
        if (!mapping)
            return { success: false, content: "You aren't authorized to use this command." };
        const guildConfig = await (0, GuildConfigCache_1.getGuildConfig)(interaction.guildId);
        const roleId = (_b = guildConfig === null || guildConfig === void 0 ? void 0 : guildConfig.roles) === null || _b === void 0 ? void 0 : _b[mapping.key];
        if (!roleId)
            return { success: false, content: `This server hasn't configured the ${mapping.key} role yet. Run /setup or configure roles in the NEST dashboard.` };
        if (!interaction.member.roles.cache.has(roleId))
            return { success: false, content: mapping.message };
        return { success: true };
    }
    /** Runs the current {@link Executor}. */
    execute(interaction) {
        var _a;
        return (_a = __classPrivateFieldGet(this, _CommandExecutor_executor, "f").call(this, interaction)) !== null && _a !== void 0 ? _a : Promise.resolve();
    }
    get disabled() {
        var _a;
        return (_a = __classPrivateFieldGet(this, _CommandExecutor_disabled, "f")) !== null && _a !== void 0 ? _a : false;
    }
}
exports.CommandExecutor = CommandExecutor;
_CommandExecutor_executor = new WeakMap(), _CommandExecutor_base_permission = new WeakMap(), _CommandExecutor_disabled = new WeakMap();
