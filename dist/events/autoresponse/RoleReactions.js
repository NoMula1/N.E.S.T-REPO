"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const discord_js_1 = require("discord.js");
const logging_1 = require("../../utils/logging");
const RoleReactions_1 = require("../../utils/RoleReactions");
const GenUtils_1 = require("../../utils/GenUtils");
exports.default = {
    name: discord_js_1.Events.MessageReactionAdd,
    once: false,
    async execute(_, reaction, user) {
        var _a, _b, _c, _d;
        const hunk = (0, RoleReactions_1.getRoleByReaction)(reaction.emoji.id);
        if (!hunk) {
            return;
        }
        if (reaction.partial) {
            try {
                await reaction.fetch();
            }
            catch (_e) {
                logging_1.Log.warn('Failed to fetch partial for reaction');
                return;
            }
        }
        const member = await reaction.message.guild.members.fetch(user.id);
        if (!member.permissions.has(discord_js_1.PermissionFlagsBits.ManageMessages))
            return;
        if ((hunk.name.toLowerCase() === 'expert educator' || hunk.name.toLowerCase() === 'master educator') && !member.roles.cache.find((r) => r.name.toLowerCase() === 'senior help forums moderator')) {
            logging_1.Log.warn(`User <@${user.id}> attempted to add the role <@&${hunk.roleid}> to user <@${(_a = reaction.message.member) === null || _a === void 0 ? void 0 : _a.id}>`);
            return;
        }
        await ((_b = reaction.message.member) === null || _b === void 0 ? void 0 : _b.roles.add(hunk.roleid).catch(async (err) => {
            var _a;
            await reaction.message.react('❌');
            await member.user.send(`A reaction role was detected, but I failed to add the role to user <@${(_a = reaction.message.member) === null || _a === void 0 ? void 0 : _a.id}>: ${err}`).catch(() => { });
            return;
        }));
        if (!hunk.congratulatory)
            return;
        await (0, GenUtils_1.sendModLogs)({ guild: reaction.message.guild, mod: member, targetUser: (_c = reaction.message.member) === null || _c === void 0 ? void 0 : _c.user, action: "Ban" }, { title: "Reaction Role Added", actionInfo: `**Role Name**: <:${reaction.emoji.name}:${reaction.emoji.id}> ${hunk.name}\n**Role**: <@${hunk.roleid}>`, channel: reaction.message.channel || undefined });
        await ((_d = reaction.message.member) === null || _d === void 0 ? void 0 : _d.send({
            embeds: [
                new discord_js_1.EmbedBuilder()
                    .setTitle(`Awarded with ${hunk.name}`)
                    .setDescription(`Congratulations! A moderator in **NIGHTHAWK SERVERS** has awarded you with <:${reaction.emoji.name}:${reaction.emoji.id}>**${hunk.name}** from [this message](${reaction.message.url}.)`)
                    .addFields({
                    name: 'What does this mean from us?',
                    value: `NIGHTHAWK SERVERS revolves around *you*, and this is our way of showing our hand-picked recognition and appreciation for the people who truly make the server what it is. You have consistently helped push the mission of our server, which is to create a place of warmth where developers are encouraged to do what they do best.\nA huge ***thank you*** from all staff of NIGHTHAWK SERVERS, for all that you do!`
                })
                    .setColor(0x2ECC71)
                    .setFooter({
                    text: `Awarded by ${member.user.username}`
                })
            ]
        }).catch((e) => {
            logging_1.Log.error('Unable to notify player of reaction role award: ' + e);
        }));
    }
};
/*
Congratulations! A moderator in **NIGHTHAWK SERVERS** has awarded you with <$RELATED_EMOJI$> **<$ROLE_NAME$>** from [this messages](<$MESSAGE_URL$>)
<FIELD_NAME> What does this mean from us? </FIELD_NAME>
NIGHTHAWK SERVERS revolves around *you*, and this is our way of showing our hand-picked recognition and appreciation for the people who truly make the server what it is. You have consistently helped push the mission of our server, which is to create a place of warmth where developers are encouraged to do what they do best.
A huge ***thank you*** from all staff of NIGHTHAWK SERVERS, for all that you do!
*/ 
