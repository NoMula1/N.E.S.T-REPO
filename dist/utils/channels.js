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
    Channel["BOT_COMMANDS"] = "1403396269589794827";
    Channel["MOD_MAIL"] = "1480795474137972746";
    Channel["QOTD"] = "1480800774123557059";
})(Channel || (exports.Channel = Channel = {}));
