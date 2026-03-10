import CoreClient from "../../../bootstrap/CoreClient"
import Bans from "../../../schemas/Bans"
import Case from "../../../schemas/Case"

export async function checkBans() {
	const bans = await Bans.find({
		endDate: { $lt: Math.floor(Date.now() / 1000) }
	})

	if (!bans || bans.length <= 0) return

	bans.forEach(async (ban) => {
		const user = await CoreClient.instance.users.fetch(ban.userID!).catch(() => { })
		if (!user) return

		const guild = await CoreClient.instance.guilds.fetch(ban.guildID!).catch(() => { })
		if (!guild) return

		const theCase = await Case.findOneAndUpdate({
			guildID: guild.id,
			caseNumber: ban.caseNumber,
		}, {
			active: false
		})

		if (theCase?.active == true) return

		await guild.members.unban(user, "Ban expired.").catch(() => { return })


		await ban.deleteOne(
			{
				guildID: ban.guildID,
				userID: ban.userID,
				endDate: ban.endDate
			}
		)
	})
}

setInterval(checkBans, 10 * 1000) 