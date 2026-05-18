"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChannel = getChannel;
const GuildConfigCache_1 = require("./GuildConfigCache");
async function getChannel(guildId, key) {
    var _a, _b;
    const config = await (0, GuildConfigCache_1.getGuildConfig)(guildId);
    return (_b = (_a = config === null || config === void 0 ? void 0 : config.channels) === null || _a === void 0 ? void 0 : _a[key]) !== null && _b !== void 0 ? _b : null;
}
