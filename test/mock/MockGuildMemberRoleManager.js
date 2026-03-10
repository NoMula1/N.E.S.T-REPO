"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _MockGuildMemberRoleManager_cache;
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
// @ts-expect-error Extending private class for mocking
class MockGuildMemberRoleManager extends discord_js_1.GuildMemberRoleManager {
    constructor(member) {
        super(member);
        _MockGuildMemberRoleManager_cache.set(this, new discord_js_1.Collection());
    }
    get cache() {
        return __classPrivateFieldGet(this, _MockGuildMemberRoleManager_cache, "f");
    }
    async add(roleOrRoles, reason) {
        if (roleOrRoles instanceof discord_js_1.Collection || Array.isArray(roleOrRoles)) {
            for (const role of roleOrRoles.values()) {
                this.addRole(role);
            }
        }
        else {
            this.addRole(roleOrRoles);
        }
        return super.add(roleOrRoles, reason);
    }
    addRole(role) {
        if (role instanceof discord_js_1.Role) {
            __classPrivateFieldGet(this, _MockGuildMemberRoleManager_cache, "f").set(role.id, role);
        }
        else {
            const id = role;
            // @ts-expect-error Need to create a role.
            const newRole = this.guild.roles._add({
                id: role,
                name: role
            });
            __classPrivateFieldGet(this, _MockGuildMemberRoleManager_cache, "f").set(id, newRole);
        }
    }
    async remove(roleOrRoles, reason) {
        if (roleOrRoles instanceof discord_js_1.Collection || Array.isArray(roleOrRoles)) {
            for (const role of roleOrRoles.values()) {
                this.removeRole(role);
            }
        }
        else {
            this.removeRole(roleOrRoles);
        }
        return super.remove(roleOrRoles, reason);
    }
    removeRole(role) {
        if (role instanceof discord_js_1.Role) {
            __classPrivateFieldGet(this, _MockGuildMemberRoleManager_cache, "f").delete(role.id);
        }
        else {
            __classPrivateFieldGet(this, _MockGuildMemberRoleManager_cache, "f").delete(role);
        }
    }
}
_MockGuildMemberRoleManager_cache = new WeakMap();
exports.default = MockGuildMemberRoleManager;
