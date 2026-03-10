import { ButtonInteraction, ChatInputCommandInteraction, Interaction, StringSelectMenuInteraction, User } from "discord.js"
import PostTemplates from "../schemas/PostTemplates"
import CoreClient from "../bootstrap/CoreClient"

export async function getUserInformation(id: string) {
	const heldPosts = await PostTemplates.countDocuments({
		isQueueServed: true,
		queueServedTo: id,
		isSuspended: true
	})

	const currentlyViewingPost = await PostTemplates.findOne({
		isQueueServed: true,
		queueServedTo: id,
		isSuspended: false
	})

	return {
		heldPosts,
		currentlyViewingPost
	}
}

export async function validateAllQueues() {
	const expiredQueuedTemplates = await PostTemplates.find({
		isQueueServed: true,
		isSuspended: false,
		waitingForApproval: true,
		queueServedAt: {
			$lt: new Date().setMinutes(new Date().getMinutes() - 10)
		}
	})
	for (const expired of expiredQueuedTemplates) {
		const user: User = CoreClient.instance.users.cache.get(expired.queueServedTo ?? "0") ?? await CoreClient.instance.users.fetch(expired.queueServedTo as string)
		if (user) {
			await user.send(`You seem to have left a post template in the queue unattended for more than 10 minutes, so I've released it back into the queue for you.`)
		}
		await expired.updateOne({
			isQueueServed: false,
			isSuspended: false
		})
	}
}

export async function getNextInQueue() {
	const nextInQueue = await PostTemplates.findOne({
		waitingForApproval: true,
		$and: [
			{
				$or: [
					{
						isSuspended: false
					},
					{
						isSuspended: { $exists: false }
					}
				]
			},
			{
				$or: [
					{
						isQueueServed: false
					},
					{
						isQueueServed: { $exists: false}
					}
				]
			}
		]
	}).sort({ updatedAt: 1 }).exec()
	return nextInQueue
}

export async function getQueueLength() {
	return await PostTemplates.countDocuments({
		isQueueServed: false,
		isSuspended: false,
		waitingForApproval: true
	})
}

export async function resolveTemplateFromContent(content: string) {
	const spl = content.split("~")
	if (spl.length < 2)
		return null

	return (await PostTemplates.findOne({
		_id: spl[1].trim()
	}))
}

export async function claimOwnership(id: string, interaction: ChatInputCommandInteraction<"cached"> | ButtonInteraction<"cached"> | StringSelectMenuInteraction<"cached">) {
	const found = await PostTemplates.findOne({
		_id: id
	})
	if (!found)
		return

	await found.updateOne({
		queueServedTo: interaction.user.id,
		queueServedAt: new Date(),
		isQueueServed: true,
	})
}

export async function validateOwnership(id: string, userId: string) {
	const validated = await PostTemplates.findOne({
		_id: id,
		waitingForApproval: true,
		isQueueServed: true,
		queueServedTo: userId
	})
	return validated !== undefined && validated !== null
}