import RoleBans from "../../schemas/RoleBans"
import Case from "../../schemas/Case"
import CoreClient from "../../bootstrap/CoreClient"
import { client } from "../../Core"

export async function checkRoleBans() {
	const usersBanned = await RoleBans.find({
		endDate: { $lt: Math.floor(Date.now() / 1000), $gt: 0 }
	})

	if (!usersBanned || usersBanned.length <= 0) return

	usersBanned.forEach(async (file) => {
		const user = await client.users.fetch(file.userID!).catch(() => { })
		if (!user) {
			await file.deleteOne()
			console.log("No user found!")
			return
		}

		const guild = await client.guilds.fetch(file.guildID!).catch(() => { })
		if (!guild) {
			await file.deleteOne()
			console.log("No guild found!")
			return
		}

		await Case.findOneAndUpdate({
			guildID: guild.id,
			caseNumber: file.caseNumber,
		}, {
			active: false
		})

		await guild.members.cache.get(user.id)?.roles.remove(file.roleID!).catch(() => { console.log("Err 1!") })


		await file.deleteOne(
			{
				guildID: file.guildID,
				userID: file.userID,
				endDate: file.endDate
			}
		)
	})
}

setInterval(checkRoleBans, 13 * 1000) 