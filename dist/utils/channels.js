"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Channel = void 0;
exports.default = channel;
exports.channels = channels;
function channel(id) {
    return id;
}
function channels(ids) {
    return ids.map(id => channel(id));
}
var Channel;
(function (Channel) {
    Channel["BOT_COMMANDS"] = "CHANNELIDCHANGE";
    Channel["MOD_MAIL"] = "CHANNELIDCHANGE";
    Channel["QOTD"] = "CHANNELIDCHANGE";
})(Channel || (exports.Channel = Channel = {}));
