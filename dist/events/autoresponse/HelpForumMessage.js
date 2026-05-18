"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const GuildConfigCache_1 = require("../../utils/GuildConfigCache");
const isSnowflake = (id) => typeof id === 'string' && /^\d{17,20}$/.test(id);
exports.default = {
    name: discord_js_1.Events.ThreadCreate,
    once: false,
    async execute(_, thread) {
        var _a, _b, _c, _d;
        if (!thread.parent || thread.parent.type !== discord_js_1.ChannelType.GuildForum)
            return;
        if (!thread.guildId)
            return;
        // Match against the configured help forum channel ID
        const guildCfg = await (0, GuildConfigCache_1.getGuildConfig)(thread.guildId);
        const helpForumId = (_a = guildCfg === null || guildCfg === void 0 ? void 0 : guildCfg.channels) === null || _a === void 0 ? void 0 : _a.helpForum;
        const isHelpForum = isSnowflake(helpForumId)
            ? thread.parentId === helpForumId
            : thread.parent.name.toLowerCase() === 'help'; // fallback by name if not configured
        if (!isHelpForum)
            return;
        // Build the welcome message — mention the marketplace channels if configured
        const hiringId = (_b = guildCfg === null || guildCfg === void 0 ? void 0 : guildCfg.channels) === null || _b === void 0 ? void 0 : _b.hiring;
        const forHireId = (_c = guildCfg === null || guildCfg === void 0 ? void 0 : guildCfg.channels) === null || _c === void 0 ? void 0 : _c.forHire;
        const sellingId = (_d = guildCfg === null || guildCfg === void 0 ? void 0 : guildCfg.channels) === null || _d === void 0 ? void 0 : _d.selling;
        const marketplaceRef = [hiringId, forHireId, sellingId].filter(isSnowflake).map(id => `<#${id}>`).join(', ');
        const marketplaceNote = marketplaceRef.length > 0
            ? `If you have a **Hiring**, **For-Hire**, or **Selling** post, visit ${marketplaceRef} and close this post.`
            : `If you have a **Hiring**, **For-Hire**, or **Selling** post, please use the marketplace channels and close this post.`;
        await thread.send({
            content: `Hey <@${thread.ownerId}>, thanks for creating a help post! To make sure you receive a response, please review the guide below:\n- Ensure your post has good grammar and readability.\n- Make sure to provide **full screenshots** of any code output, if applicable.\n- State all of the troubleshooting steps you have already attempted.\n- Ensure you have an issue that __has a solution__; for learning, consider searching existing resources first.\n- ${marketplaceNote}`
        }).catch(() => { });
    }
};
