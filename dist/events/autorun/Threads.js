"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const discord_js_1 = require("discord.js");
exports.default = {
    name: discord_js_1.Events.ThreadCreate,
    once: false,
    async execute(_, thread) {
        try {
            await thread.join();
            console.log(`Joined ${thread.name}`);
        }
        catch (err) {
            console.log(`failed to join thread: ${err}`);
        }
    }
};
