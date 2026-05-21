"use strict";
/**
 * AuditInference.ts
 *
 * Handles inferred case logging
 */
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
exports.default = {
    name: discord_js_1.Events.InteractionCreate,
    once: false,
    async execute(_, i) {
        if (!i.isStringSelectMenu())
            return;
        if (!i.inCachedGuild())
            return;
        // if (!i.ismessage)
    }
};
