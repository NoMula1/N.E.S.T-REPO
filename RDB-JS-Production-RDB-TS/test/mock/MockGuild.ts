import { Client, Guild, GuildVerificationLevel, GuildDefaultMessageNotifications, GuildExplicitContentFilter, GuildMFALevel, GuildSystemChannelFlags, GuildPremiumTier, GuildNSFWLevel, APIGuild } from "discord.js"
import { RawGuildData } from "discord.js/typings/rawDataTypes"
import MockClient from "./MockClient"

// TODO: Allow mock roles to be added

// @ts-expect-error Extending private class for mocking
export default class MockGuild extends Guild {
	constructor(client: MockClient, data: RawGuildData | null = null) {
		super(client, data ?? {
			id: '000000000000000000',
			name: 'Mock',
			icon: null,
			splash: null,
			discovery_splash: null,
			owner_id: '000000000000000000',
			region: 'us', // I don't actually know possible values
			afk_channel_id: null,
			afk_timeout: 60,
			verification_level: GuildVerificationLevel.None,
			default_message_notifications: GuildDefaultMessageNotifications.AllMessages,
			explicit_content_filter: GuildExplicitContentFilter.Disabled,
			roles: [],
			emojis: [],
			features: [],
			mfa_level: GuildMFALevel.None,
			application_id: null,
			system_channel_id: null,
			system_channel_flags: 0 as GuildSystemChannelFlags,
			rules_channel_id: null,
			vanity_url_code: null,
			description: null,
			banner: null,
			premium_tier: GuildPremiumTier.None,
			preferred_locale: 'en',
			public_updates_channel_id: null,
			nsfw_level: GuildNSFWLevel.Default,
			stickers: [],
			premium_progress_bar_enabled: false,
			hub_type: null,
			safety_alerts_channel_id: null
		} as APIGuild)
		//this.roles = new MockRoleManager(this)
		client.guilds.cache.set('000000000000000000', this)
	}

	patch(data: RawGuildData) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(this as any)._patch(data)
	}
}
