"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const MockUser_1 = __importDefault(require("./mock/MockUser"));
const MockGuildMember_1 = __importDefault(require("./mock/MockGuildMember"));
const discord_js_1 = require("discord.js");
const MockBaseChannel_1 = __importDefault(require("./mock/MockBaseChannel"));
const MockGuild_1 = __importDefault(require("./mock/MockGuild"));
const MockClient_1 = __importDefault(require("./mock/MockClient"));
describe('Mocking', function () {
    this.beforeAll(async function () {
        await MockClient_1.default.prepareEnv();
    });
    this.afterAll(async function () {
        await MockClient_1.default.unprepareEnv();
    });
    describe('MockUser', function () {
        it('Can patch', function () {
            const user = new MockUser_1.default();
            user.patch({
                id: '123456789012345678',
                username: 'Other Mock User',
                discriminator: '0',
                global_name: null,
                avatar: null
            });
        });
    });
    describe('MockGuildMember', function () {
        it('Can patch', function () {
            const member = new MockGuildMember_1.default(new MockGuild_1.default(new MockClient_1.default()));
            member.patch({
                roles: [],
                joined_at: Date.now().toString(),
                deaf: false,
                mute: false
            });
        });
        it('Can add a role', async function () {
            const member = new MockGuildMember_1.default(new MockGuild_1.default(new MockClient_1.default()));
            await member.roles.add('000000000000000000');
            assert_1.default.ok(member.roles.cache.has('000000000000000000'));
        });
        it('Can remove a role', async function () {
            const member = new MockGuildMember_1.default(new MockGuild_1.default(new MockClient_1.default()));
            await member.roles.add('000000000000000000');
            await member.roles.remove('000000000000000000');
            assert_1.default.ok(!member.roles.cache.has('000000000000000000'));
        });
    });
    describe('MockBaseChannel', function () {
        it('Can patch', function () {
            const channel = new MockBaseChannel_1.default();
            channel.patch({
                type: discord_js_1.ChannelType.DM
            });
        });
    });
});
