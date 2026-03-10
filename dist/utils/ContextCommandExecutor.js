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
const GlobalScope_1 = require("../bootstrap/GlobalScope");
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
        var _a, _b, _c, _d, _e, _f;
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
        // Check toggle
        // TODO: Implement the togglestatus
        // if (!(interaction.member?.permissions as Readonly<PermissionsBitField>)?.has(PermissionsBitField.Flags.Administrator)) {
        //     return {
        //         success: false,
        //         content: 'This command was disabled by an administrator.',
        //         ephemeral: true
        //     }
        // }
        if (this.scope !== GlobalScope_1.scope) {
            return {
                success: false,
                content: `You are not allowed to run a ${(0, GlobalScope_1.toString)(this.scope)} command in the ${(0, GlobalScope_1.toString)(GlobalScope_1.scope)} scope.`
            };
        }
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
        // Check base permissions
        switch (__classPrivateFieldGet(this, _ContextCommandExecutor_base_permission, "f").Level) {
            case CommandExecutor_1.PermissionLevel.AssistantModerator:
                if (interaction.member.roles.highest.position < ((_c = interaction.member.guild.roles.cache.find((r) => r.name.toLowerCase() === "assistant moderator")) === null || _c === void 0 ? void 0 : _c.position)) {
                    return {
                        success: false,
                        content: "You must be Assistant Moderator and up to use this command."
                    };
                }
                break;
            case CommandExecutor_1.PermissionLevel.Moderator:
                if (((_d = interaction.member.roles.cache.find((r) => r.name.toLowerCase() === "moderator")) === null || _d === void 0 ? void 0 : _d.position) > interaction.member.roles.highest.position) {
                    return {
                        success: false,
                        content: "You must be Moderator and up to use this command."
                    };
                }
                break;
            case CommandExecutor_1.PermissionLevel.AssistantAdministrator:
                if (((_e = interaction.member.roles.cache.find((r) => r.name.toLowerCase() === "assistant administrator")) === null || _e === void 0 ? void 0 : _e.position) > interaction.member.roles.highest.position) {
                    return {
                        success: false,
                        content: "You must be Moderator and up to use this command."
                    };
                }
                break;
            case CommandExecutor_1.PermissionLevel.Administrator:
                if (((_f = interaction.member.roles.cache.find((r) => r.name.toLowerCase() === "administrator")) === null || _f === void 0 ? void 0 : _f.position) > interaction.member.roles.highest.position) {
                    return {
                        success: false,
                        content: "You must be Administrator and up to use this command."
                    };
                }
                break;
            case CommandExecutor_1.PermissionLevel.Developer:
                let response = false;
                for (const dev of config_1.config.devs) {
                    if (dev === interaction.user.id) {
                        response = true;
                        break;
                    }
                }
                if (response == false) {
                    return {
                        success: false,
                        content: "You must be a NEST developer to use this command."
                    };
                }
                break;
            default:
                return {
                    success: true
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
        return (_a = __classPrivateFieldGet(this, _ContextCommandExecutor_executor, "f").call(this, interaction)) !== null && _a !== void 0 ? _a : Promise.resolve();
    }
    get scope() {
        var _a;
        return (_a = __classPrivateFieldGet(this, _ContextCommandExecutor_base_permission, "f").Scope) !== null && _a !== void 0 ? _a : GlobalScope_1.Scope.Default;
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
