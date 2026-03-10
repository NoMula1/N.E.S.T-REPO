import { Guild, GuildMember, APIGuildMember, Snowflake, GuildMemberRoleManager } from "discord.js"
import MockGuildMemberRoleManager from "./MockGuildMemberRoleManager"

// @ts-expect-error Extending private class for mocking
export default class MockGuildMember extends GuildMember {
	#roles: GuildMemberRoleManager = new MockGuildMemberRoleManager(this)

	constructor(guild: Guild) {
		// TODO: Add a user field
		super(guild.client, {
			roles: [] as Snowflake[],
			joined_at: Date.UTC(0).toString(),
			deaf: false,
			mute: false,
			user: {
				id: '000000000000000000',
				username: 'Mock',
				discriminator: '0',
				global_name: 'Mock',
				avatar: null
			}
		} as APIGuildMember, guild)
	}

	patch(data: APIGuildMember) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(this as any)._patch(data)
	}

	get roles() {
		return this.#roles
	}
}
