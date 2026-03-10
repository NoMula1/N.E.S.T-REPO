import { Events, GuildMember, Message } from "discord.js"
import MemberStats from "../../../schemas/MemberStats"
import { Log } from "../../../utils/logging"
import { EventOptions } from "../../../utils/RegisterEvents"

const COOLDOWN = 5 * 60 * 1000 // 5 minutes (milliseconds)

async function createStats(member: GuildMember, now: number) {
	await MemberStats.create({
		member: member.id,
		points: 1,
		lastPointsAwarded: now,
		regular: 1,
		attachments: 0,
		replies: 0
	})
	Log.info(`Created statistics for member: ${member.displayName}`)
}

export default {
	name: Events.MessageCreate,
	once: false,
	async execute(_: EventOptions, message: Message) {
		if (!message.member) return
		if (message.author.bot) return
		const now = Date.now()
		const stats = await MemberStats.findOne({ member: message.member.id })
		if (!stats) {
			await createStats(message.member, now)
		} else if ((now - stats.lastPointsAwarded) > COOLDOWN) {
			//Log.info(`Awarded points to member: ${message.member.displayName}`);
			await stats.updateOne({
				points: stats.points + 1,
				lastPointsAwarded: now,
				regular: (stats.regular ?? 0) + 1,
				attachments: (message.attachments.size >= 1) ? ((stats.attachments ?? 0) + 1) : (stats.attachments ?? 0),
				replies: (message.reference) ? ((stats.replies ?? 0) + 1) : (stats.attachments ?? 0)
			})
		}
	}
}
