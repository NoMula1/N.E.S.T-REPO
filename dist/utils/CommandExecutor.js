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
exports.CommandExecutor = exports.PermissionLevel = exports.RoleIDS = void 0;
const discord_js_1 = require("discord.js");
const config_1 = require("../utils/config");
const GlobalScope_1 = require("../bootstrap/GlobalScope");
exports.RoleIDS = {
    MarketStaff: '1480436503187423342', // Market department staff
    TrialHelpModerator: '1480437092361175163', // Trial Help Moderator
    HelpModerator: '1480436761938104380', // Help Moderator
    MarketModerator: '1480435758845395045', // Market Moderator
    HelpManager: '1480436823984705557', // Help Forums Manger
    AssistantModerator: '1392220113909846018', // '489428524298534942', //   Trial
    Moderator: '1406065795464822917', // Community Moderator
    SeniorMarketModerator: '1480436288296583228', // Senior Marketplace Moderator
    AssistantAdministrator: '1390774033586458745', // Senior Community Moderator / Assistant Administrator
    Administrator: '1473948752720040087', // Server Manager / Administrator
};
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
    /** Requires the Senior Market Moderator role. */
    PermissionLevel[PermissionLevel["SeniorMarketModerator"] = 8] = "SeniorMarketModerator";
    /** Requires the Assistant Administrator role. */
    PermissionLevel[PermissionLevel["AssistantAdministrator"] = 9] = "AssistantAdministrator";
    /** Requires the Market Manager role. */
    PermissionLevel[PermissionLevel["MarketManager"] = 10] = "MarketManager";
    /** Requires the Administrator role. */
    PermissionLevel[PermissionLevel["Administrator"] = 11] = "Administrator";
    /** Must be a part of the devs array in config.json. */
    PermissionLevel[PermissionLevel["Developer"] = 12] = "Developer";
})(PermissionLevel || (exports.PermissionLevel = PermissionLevel = {}));
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
        if (!interaction.inCachedGuild())
            return { success: false, content: "You must use this in a guild." };
        /*
        if (!(interaction.member?.permissions as Readonly<PermissionsBitField>)?.has([
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.EmbedLinks])) {
            return {
                success: false
            };
        }
        */
        if (!__classPrivateFieldGet(this, _CommandExecutor_base_permission, "f").NotRole)
            __classPrivateFieldGet(this, _CommandExecutor_base_permission, "f").NotRole = [];
        if (!__classPrivateFieldGet(this, _CommandExecutor_base_permission, "f").NotUser)
            __classPrivateFieldGet(this, _CommandExecutor_base_permission, "f").NotUser = [];
        if (!__classPrivateFieldGet(this, _CommandExecutor_base_permission, "f").HasRole)
            __classPrivateFieldGet(this, _CommandExecutor_base_permission, "f").HasRole = [];
        if (!__classPrivateFieldGet(this, _CommandExecutor_base_permission, "f").IsUser)
            __classPrivateFieldGet(this, _CommandExecutor_base_permission, "f").IsUser = [];
        // Check toggle
        // TODO: Implement the togglestatus
        // if (!(interaction.member?.permissions as Readonly<PermissionsBitField>)?.has(PermissionsBitField.Flags.Administrator)) {
        //     return {
        //         success: false,
        //         content: 'This command was disabled by an administrator.',
        //         ephemeral: true
        //     }
        // }
        if (this.disabled) {
            return {
                success: false,
                content: `This command has been disabled. Please contact a Bot Developer if you believe this is an error.`
            };
        }
        if (this.scope !== GlobalScope_1.scope) {
            return {
                success: false,
                content: `You are not allowed to run a ${(0, GlobalScope_1.toString)(this.scope)} command in the ${(0, GlobalScope_1.toString)(GlobalScope_1.scope)} scope.`
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
        // Check base permissions
        switch (__classPrivateFieldGet(this, _CommandExecutor_base_permission, "f").Level) {
            case PermissionLevel.MarketStaff:
                if (!interaction.member.roles.cache.has(exports.RoleIDS.MarketStaff)) {
                    return {
                        success: false,
                        content: "You must be Trial Market Moderator and up to use this command."
                    };
                }
                break;
            case PermissionLevel.TrialHelpModerator:
                if (!interaction.member.roles.cache.has(exports.RoleIDS.TrialHelpModerator)) {
                    return {
                        success: false,
                        content: "You must be Trial Help Moderator and up to use this command."
                    };
                }
                break;
            case PermissionLevel.HelpModerator:
                if (!interaction.member.roles.cache.has(exports.RoleIDS.HelpModerator)) {
                    return {
                        success: false,
                        content: "You must be Help Moderator and up to use this command."
                    };
                }
                break;
            case PermissionLevel.MarketModerator:
                if (!interaction.member.roles.cache.has(exports.RoleIDS.MarketModerator)) {
                    return {
                        success: false,
                        content: "You must be Market Moderator and up to use this command."
                    };
                }
                break;
            case PermissionLevel.HelpManager:
                if (!interaction.member.roles.cache.has(exports.RoleIDS.HelpManager)) {
                    return {
                        success: false,
                        content: "You must be Help Manager and up to use this command."
                    };
                }
                break;
            case PermissionLevel.AssistantModerator:
                if (!interaction.member.roles.cache.has(exports.RoleIDS.AssistantModerator)) {
                    return {
                        success: false,
                        content: "You must be Assistant Moderator and up to use this command."
                    };
                }
                break;
            case PermissionLevel.Moderator:
                if (!interaction.member.roles.cache.has(exports.RoleIDS.Moderator)) {
                    return {
                        success: false,
                        content: "You must be Moderator and up to use this command."
                    };
                }
                break;
            case PermissionLevel.SeniorMarketModerator:
                if (!interaction.member.roles.cache.has(exports.RoleIDS.SeniorMarketModerator)) {
                    return {
                        success: false,
                        content: "You must be Assistant Moderator and up to use this command."
                    };
                }
                break;
            case PermissionLevel.AssistantAdministrator:
                if (!interaction.member.roles.cache.has(exports.RoleIDS.AssistantAdministrator)) {
                    return {
                        success: false,
                        content: "You must be Senior Moderator and up to use this command."
                    };
                }
                break;
            case PermissionLevel.Administrator:
                if (!interaction.member.roles.cache.has(exports.RoleIDS.Administrator)) {
                    return {
                        success: false,
                        content: "You must be Administrator and up to use this command."
                    };
                }
                break;
            case PermissionLevel.Developer:
                let response = false;
                console.log(`⚙️ Dev check - User ID: ${interaction.user.id}, Allowed devs:`, config_1.config.devs);
                for (const dev of config_1.config.devs) {
                    if (dev === interaction.user.id) {
                        response = true;
                        break;
                    }
                }
                if (response == false) {
                    return {
                        success: false,
                        content: "You must be an NEST developer to use this command."
                    };
                }
                break;
            case PermissionLevel.None:
                break;
            default:
                return {
                    success: false,
                    content: "You aren't authorized to use this command."
                };
        }
        // if (!this.#base_permission(interaction)) {
        //     return {
        //         success: false,
        //         content: "You aren't authorized to use this command."
        //     }
        // }
        // Success
        return {
            success: true
        };
    }
    /** Runs the current {@link Executor}. */
    execute(interaction) {
        var _a;
        return (_a = __classPrivateFieldGet(this, _CommandExecutor_executor, "f").call(this, interaction)) !== null && _a !== void 0 ? _a : Promise.resolve();
    }
    get scope() {
        var _a;
        return (_a = __classPrivateFieldGet(this, _CommandExecutor_base_permission, "f").Scope) !== null && _a !== void 0 ? _a : GlobalScope_1.Scope.Default;
    }
    get disabled() {
        var _a;
        return (_a = __classPrivateFieldGet(this, _CommandExecutor_disabled, "f")) !== null && _a !== void 0 ? _a : false;
    }
}
exports.CommandExecutor = CommandExecutor;
_CommandExecutor_executor = new WeakMap(), _CommandExecutor_base_permission = new WeakMap(), _CommandExecutor_disabled = new WeakMap();
