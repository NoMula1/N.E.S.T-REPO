import { TextChannel } from "discord.js"
import Post from "../../schemas/Post"
import FastFlag from "../../schemas/FastFlag"
import CoreClient from "../../bootstrap/CoreClient"
import { Log } from "../../utils/logging"
import { client } from "../../Core"

let globalIsTaskWorking = false
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function checkCases() {
	if (globalIsTaskWorking) return // task is already working through (assumably) a large dataset, we dont want to double team here!!
	globalIsTaskWorking = true
	const flag = await FastFlag.findOne({
		refName: 'DoPostExpiration',
		enabled: true
	})
	if (!flag) {
		return
	}
	const expiredPosts = await Post.find({
		createdAt: {
			$lt: Date.now() - 7 * 24 * 60 * 60 * 1000
		}
	})

	let batchTracker = 0

	for (const expiredPost of expiredPosts) {
		// check if message exists
		batchTracker += 1
		const channel = await client.channels.fetch(expiredPost.jobChannelId!).catch(() => { })
		if (!channel) {
			Log.info(`Deleting post with ID ${expiredPost._id} because it has expired.`)
			await expiredPost.deleteOne()
			if (batchTracker >= 5) {
				batchTracker = 0
				await sleep(5000)
			}
			continue
		}
		const message = await (channel as TextChannel).messages.fetch(expiredPost.messageId!).catch(async (err) => { })
		if (!message) {
			Log.info(`Deleting post with ID ${expiredPost._id} because it has expired.`)
			await expiredPost.deleteOne()
			if (batchTracker >= 5) {
				batchTracker = 0
				await sleep(5000)
			}
			continue
		}
		await message.delete().catch(async (err) => { })
		Log.info(`Deleting post with ID ${expiredPost._id} because it has expired.`)
		await expiredPost.deleteOne()
		if (batchTracker >= 5) {
			batchTracker = 0
			await sleep(5000)
		}
	}
	globalIsTaskWorking = false
}

setInterval(checkCases, 60_000) 