import { Events, GuildMember, Role } from "discord.js"
import RoleBans from "../../schemas/RoleBans"
import PendingDeletion from "../../schemas/PendingDeletion"
import { EventOptions } from "../../utils/RegisterEvents"

export default {
	name: Events.GuildMemberRemove,
	once: false,
	async execute(_: EventOptions, member: GuildMember) {

		console.log(member.id + ' left, creating deletion...')
		await PendingDeletion.create({
			userID: member.id
		})

	}
}