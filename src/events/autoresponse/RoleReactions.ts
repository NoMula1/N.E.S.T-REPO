/* eslint-disable no-console */
/* import { EmbedBuilder, Events, Message, MessageReaction, PermissionFlagsBits, User } from "discord.js"
import { Log, LogLevel } from "../../utils/logging"
import { getRoleByReaction } from "../../utils/RoleReactions"
import { sendModLogs } from "../../utils/GenUtils"
import { EventOptions } from "../../utils/RegisterEvents"

export default {
	name: Events.MessageReactionAdd,
	once: false,
	async execute(_: EventOptions, reaction: MessageReaction, user: User) {
		const hunk = getRoleByReaction(reaction.emoji.id!)
		if (!hunk) {
			return
		}
		if (reaction.partial) {
			try {
				await reaction.fetch()
			} catch {
				Log.warn('Failed to fetch partial for reaction')
				return
			}
		}

		const member = await reaction.message.guild!.members.fetch(user.id)
		if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) return
		if ((hunk.name.toLowerCase() === 'expert educator' || hunk.name.toLowerCase() === 'master educator') && !member.roles.cache.find((r) => r.name.toLowerCase() === 'senior help forums moderator')) {
			Log.warn(`User <@${user.id}> attempted to add the role <@&${hunk.roleid}> to user <@${reaction.message.member?.id}>`)
			return
		}

		await reaction.message.member?.roles.add(hunk.roleid).catch(async (err) => {
			await reaction.message.react('❌')
			await member.user.send(`A reaction role was detected, but I failed to add the role to user <@${reaction.message.member?.id}>: ${err}`).catch(() => { })
			return
		})

		if (!hunk.congratulatory) return
		await sendModLogs({ guild: reaction.message.guild!, mod: member!, targetUser: reaction.message.member?.user, action: "Ban" }, { title: "Reaction Role Added", actionInfo: `**Role Name**: <:${reaction.emoji.name}:${reaction.emoji.id}> ${hunk.name}\n**Role**: <@${hunk.roleid}>`, channel: reaction.message.channel || undefined })
		await reaction.message.member?.send({
			embeds: [
				new EmbedBuilder()
					.setTitle(`Awarded with ${hunk.name}`)
					.setDescription(`Congratulations! A moderator in **NIGHTHAWK SERVERS** has awarded you with <:${reaction.emoji.name}:${reaction.emoji.id}>**${hunk.name}** from [this message](${reaction.message.url}.)`)
					.addFields(
						{
							name: 'What does this mean from us?',
							value: `NIGHTHAWK SERVERS revolves around *you*, and this is our way of showing our hand-picked recognition and appreciation for the people who truly make the server what it is. You have consistently helped push the mission of our server, which is to create a place of warmth where developers are encouraged to do what they do best.\nA huge ***thank you*** from all staff of NIGHTHAWK SERVERS, for all that you do!`
						}
					)
					.setColor(0x2ECC71)
					.setFooter({
						text: `Awarded by ${member.user.username}`
					})
			]
		}).catch((e) => {
			Log.error('Unable to notify player of reaction role award: ' + e)
		})

	}
}*/
/* 
Congratulations! A moderator in **NIGHTHAWK SERVERS** has awarded you with <$RELATED_EMOJI$> **<$ROLE_NAME$>** from [this messages](<$MESSAGE_URL$>)
<FIELD_NAME> What does this mean from us? </FIELD_NAME>
NIGHTHAWK SERVERS revolves around *you*, and this is our way of showing our hand-picked recognition and appreciation for the people who truly make the server what it is. You have consistently helped push the mission of our server, which is to create a place of warmth where developers are encouraged to do what they do best.
A huge ***thank you*** from all staff of NIGHTHAWK SERVERS, for all that you do!
*/