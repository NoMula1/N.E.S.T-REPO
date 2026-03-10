"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _MockGuildMember_roles;
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const MockGuildMemberRoleManager_1 = __importDefault(require("./MockGuildMemberRoleManager"));
// @ts-expect-error Extending private class for mocking
class MockGuildMember extends discord_js_1.GuildMember {
    constructor(guild) {
        // TODO: Add a user field
        super(guild.client, {
            roles: [],
            joined_at: Date.UTC(0).toString(),
            deaf: false,
            mute: false,
            user: {
                id: '000000000000000000',
                username: 'Mock',
                discriminator: '0',
                global_name: 'Mock',
                avatar: null
            }
        }, guild);
        _MockGuildMember_roles.set(this, new MockGuildMemberRoleManager_1.default(this));
    }
    patch(data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this._patch(data);
    }
    get roles() {
        return __classPrivateFieldGet(this, _MockGuildMember_roles, "f");
    }
}
_MockGuildMember_roles = new WeakMap();
exports.default = MockGuildMember;
