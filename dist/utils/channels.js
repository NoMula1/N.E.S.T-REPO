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
    Channel["BOT_COMMANDS"] = "1282020342457569361";
    Channel["MOD_MAIL"] = "1282020357120983101";
    Channel["QOTD"] = "1282020367002632232";
})(Channel || (exports.Channel = Channel = {}));
