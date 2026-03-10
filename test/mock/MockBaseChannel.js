"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
class MockBaseChannel extends discord_js_1.BaseChannel {
    constructor(data = undefined) {
        super(undefined, data !== null && data !== void 0 ? data : {
            type: discord_js_1.ChannelType.GuildText
        }, true);
    }
    patch(data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this._patch(data);
    }
}
exports.default = MockBaseChannel;
