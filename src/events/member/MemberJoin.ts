import { Events, GuildMember, PermissionsBitField, Role } from "discord.js"
import RoleBans from "../../schemas/RoleBans"
import PendingDeletion from "../../schemas/PendingDeletion"
import { EventOptions } from "../../utils/RegisterEvents"
import Tickets from "../../schemas/Tickets"
import { Permission } from '../../utils/CommandExecutor'
export default {
	name: Events.GuildMemberAdd,
	once: false,
	async execute(_: EventOptions, member: GuildMember) {

		// Remove deletion pending
		const foundDeletionPending = await PendingDeletion.findOne({
			userID: member.id
		})
		if (foundDeletionPending) {
			await PendingDeletion.deleteOne({
				userID: member.id
			})
		}

		const foundBan = await RoleBans.find({
			guildID: member.guild?.id,
			userID: member.id,
		})
		if (foundBan) {
			for (const file of foundBan) {
				if (!member?.roles.cache.has(file.roleID!)) {
					member?.roles.add(file.roleID!).catch(() => { })
				}
			}
		}
		const tickets = await Tickets.findOne({ users: member.user.id })
		if (tickets && tickets.status === true) {
			const channel = tickets.channelID ? member.guild?.channels.cache.get(tickets.channelID) : null
			if (channel) {
				await channel.edit({
					permissionOverwrites: [
						{
							id: member.id,
							allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
						}
					]
				})
			}
		}
	}
}