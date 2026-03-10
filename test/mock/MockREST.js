"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _MockREST_client, _MockREST_guildRoleRegex, _MockREST_guildMemberRoleRegex;
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const logging_1 = require("../../src/utils/logging");
class MockREST extends discord_js_1.REST {
    constructor(client) {
        super();
        _MockREST_client.set(this, void 0);
        _MockREST_guildRoleRegex.set(this, void 0);
        _MockREST_guildMemberRoleRegex.set(this, void 0);
        __classPrivateFieldSet(this, _MockREST_client, client, "f");
        __classPrivateFieldSet(this, _MockREST_guildRoleRegex, new RegExp(discord_js_1.Routes.guildRoles('[0-9]+').replace('/', '\\/')), "f");
        __classPrivateFieldSet(this, _MockREST_guildMemberRoleRegex, new RegExp(discord_js_1.Routes.guildMemberRole('([0-9]+)', '([0-9]+)', '([0-9]+)').replace('/', '\\/')), "f");
    }
    async get(fullRoute) {
        logging_1.Log.debug(`Made ${discord_js_1.RequestMethod.Get} request: ${fullRoute}`);
    }
    async delete(fullRoute) {
        logging_1.Log.debug(`Made ${discord_js_1.RequestMethod.Delete} request: ${fullRoute}`);
    }
    async post(fullRoute) {
        logging_1.Log.debug(`Made ${discord_js_1.RequestMethod.Post} request: ${fullRoute}`);
    }
    async put(fullRoute) {
        logging_1.Log.debug(`Made ${discord_js_1.RequestMethod.Put} request: ${fullRoute}`);
    }
    async patch(fullRoute) {
        logging_1.Log.debug(`Made ${discord_js_1.RequestMethod.Patch} request: ${fullRoute}`);
    }
    async request(options) {
        logging_1.Log.debug(`Made ${options.method} request: ${options.fullRoute}`);
    }
    //queueRequest(request: InternalRequest): Promise<ResponseLike>; // Requires a IHandler (seems complex, could just do nothing for now)
    async queueRequest(request) {
        //Log.debug(`Queued ${request.method} request: ${request.fullRoute}`)
        throw Error('queueRequest is unimplemented'); // Can't be bothered. Implement later
    }
}
_MockREST_client = new WeakMap(), _MockREST_guildRoleRegex = new WeakMap(), _MockREST_guildMemberRoleRegex = new WeakMap();
exports.default = MockREST;
