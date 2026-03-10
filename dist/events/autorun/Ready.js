"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = require("../../utils/logging");
const discord_js_1 = require("discord.js");
exports.default = {
    name: discord_js_1.Events.ClientReady,
    once: false,
    async execute(_, client) {
        var _a, _b;
        logging_1.Log.info("NEST is waking up!");
        (_a = client.user) === null || _a === void 0 ? void 0 : _a.setActivity({
            name: "🎁 Watching for /post",
            //state: "Watching",
            type: discord_js_1.ActivityType.Custom,
        });
        logging_1.Log.info("NEST has risen and is ready for duty.");
        logging_1.Log.debug(`Logged in as ${(_b = client.user) === null || _b === void 0 ? void 0 : _b.tag}!`);
    }
};
