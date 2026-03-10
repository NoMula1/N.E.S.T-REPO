/* eslint-disable no-console */
import { Events, ThreadChannel } from "discord.js"
import { EventOptions } from "../../utils/RegisterEvents"

export default {
	name: Events.ThreadCreate,
	once: false,
	async execute(_: EventOptions, thread: ThreadChannel) {
		try {
			await thread.join()
			console.log(`Joined ${thread.name}`)
		} catch (err) {
			console.log(`failed to join thread: ${err}`)
		}
	}
}