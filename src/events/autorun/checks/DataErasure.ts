import Bans from "../../../schemas/Bans"
import Case from "../../../schemas/Case"
import PendingDeletion from "../../../schemas/PendingDeletion"
import Post from "../../../schemas/Post"
import { Log } from "../../../utils/logging"
import PostTemplates from "../../../schemas/PostTemplates"

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function checkErasures() {
	return // temp disable
	/*
	const fourAndHalfHoursAgo = new Date(Date.now() - 4.5 * 60 * 60 * 1000)
	const validDataErasures = await PendingDeletion.find({
		createdAt: {
			$lt: fourAndHalfHoursAgo
		}
	})

	if (validDataErasures.length < 1)
		return

	for (const dataErasure of validDataErasures) {
		// Remove Posts
		const validPosts = await Post.find({
			userID: dataErasure.userID
		})
		for (const validPost of validPosts) {
			const guild = CoreClient.instance.guilds.cache.get(validPost.guildID!)
			if (!guild)
				continue
			const channel = guild.channels.cache.get(validPost.jobChannelId!)
			if (!channel || !channel.isTextBased())
				continue

			const message = await channel.messages.fetch(validPost.messageId!)
			if (message) {
				await message.delete()
				await Post.deleteOne({
					guildID: validPost.guildID,
					userID: validPost.userID,
					messageID: validPost.messageId,
					jobChannelId: validPost.jobChannelId
				})
			} else {
				await Post.deleteOne({
					guildID: validPost.guildID,
					userID: validPost.userID,
					messageID: validPost.messageId,
					jobChannelId: validPost.jobChannelId
				})
			}
			Log.info(`Post pending for deletion in channel ${validPost.messageId!} has been deleted. Author: ${validPost.userID!}`)
		}

		// Remove Post Templates
		const removeResult = await PostTemplates.deleteMany({
			userID: dataErasure.userID
		})
		Log.info(`Removed ${removeResult.deletedCount!} documents under "Post Template" for data pending deletion for user ${dataErasure.userID!}`)

		await PendingDeletion.deleteOne({
			userID: dataErasure.userID
		})
	}
	*/
}

setInterval(checkErasures, 14 * 1000) 