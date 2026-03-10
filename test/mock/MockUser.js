"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
class MockUser extends discord_js_1.User {
    constructor(data = null) {
        super(undefined, data !== null && data !== void 0 ? data : {
            id: '000000000000000000',
            username: 'Mock User',
            discriminator: '0',
            global_name: null,
            avatar: null
        });
    }
    patch(data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this._patch(data);
    }
}
exports.default = MockUser;
