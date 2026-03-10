"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
// TODO: Allow mock roles to be added
// @ts-expect-error Extending private class for mocking
class MockGuild extends discord_js_1.Guild {
    constructor(client, data = null) {
        super(client, data !== null && data !== void 0 ? data : {
            id: '000000000000000000',
            name: 'Mock',
            icon: null,
            splash: null,
            discovery_splash: null,
            owner_id: '000000000000000000',
            region: 'us', // I don't actually know possible values
            afk_channel_id: null,
            afk_timeout: 60,
            verification_level: discord_js_1.GuildVerificationLevel.None,
            default_message_notifications: discord_js_1.GuildDefaultMessageNotifications.AllMessages,
            explicit_content_filter: discord_js_1.GuildExplicitContentFilter.Disabled,
            roles: [],
            emojis: [],
            features: [],
            mfa_level: discord_js_1.GuildMFALevel.None,
            application_id: null,
            system_channel_id: null,
            system_channel_flags: 0,
            rules_channel_id: null,
            vanity_url_code: null,
            description: null,
            banner: null,
            premium_tier: discord_js_1.GuildPremiumTier.None,
            preferred_locale: 'en',
            public_updates_channel_id: null,
            nsfw_level: discord_js_1.GuildNSFWLevel.Default,
            stickers: [],
            premium_progress_bar_enabled: false,
            hub_type: null,
            safety_alerts_channel_id: null,
            incidents_data: null
        });
        //this.roles = new MockRoleManager(this)
        client.guilds.cache.set('000000000000000000', this);
    }
    patch(data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this._patch(data);
    }
}
exports.default = MockGuild;
