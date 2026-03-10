import assert from 'assert'
import MockUser from './mock/MockUser'
import { RawUserData } from 'discord.js/typings/rawDataTypes'
import MockGuildMember from './mock/MockGuildMember'
import { APIDMChannel, APIGuildMember, ChannelType, Snowflake } from 'discord.js'
import MockBaseChannel from './mock/MockBaseChannel'
import MockGuild from './mock/MockGuild'
import MockClient from './mock/MockClient'

describe('Mocking', function () {
	this.beforeAll(async function () {
		await MockClient.prepareEnv()
	})
	this.afterAll(async function () {
		await MockClient.unprepareEnv()
	})
	describe('MockUser', function () {
		it('Can patch', function () {
			const user = new MockUser()
			user.patch({
				id: '123456789012345678',
				username: 'Other Mock User',
				discriminator: '0',
				global_name: null,
				avatar: null
			} as RawUserData)
		})
	})
	describe('MockGuildMember', function () {
		it('Can patch', function () {
			const member = new MockGuildMember(new MockGuild(new MockClient()))
			member.patch({
				roles: [] as Snowflake[],
				joined_at: Date.now().toString(),
				deaf: false,
				mute: false
			} as APIGuildMember)
		})
		it('Can add a role', async function () {
			const member = new MockGuildMember(new MockGuild(new MockClient()))
			await member.roles.add('000000000000000000')
			assert.ok(member.roles.cache.has('000000000000000000'))
		})
		it('Can remove a role', async function () {
			const member = new MockGuildMember(new MockGuild(new MockClient()))
			await member.roles.add('000000000000000000')
			await member.roles.remove('000000000000000000')
			assert.ok(!member.roles.cache.has('000000000000000000'))
		})
	})
	describe('MockBaseChannel', function () {
		it('Can patch', function () {
			const channel = new MockBaseChannel()
			channel.patch({
				type: ChannelType.DM
			} as APIDMChannel)
		})
	})
})
