import { Log } from "../../utils/logging"
import mongoose from "mongoose"
import { ActivityType, Client, Events } from "discord.js"
import { EventOptions } from "../../utils/RegisterEvents"
import { startScheduler } from "../../automation/scheduler"

export default {
	name: Events.ClientReady,
	once: false,
	async execute(_: EventOptions, client: Client) {
		Log.info("NEST is waking up!")

		client.user?.setActivity({
			name: "🎁 Watching for /post",
			//state: "Watching",
			type: ActivityType.Custom,
		})

		Log.info("NEST has risen and is ready for duty.")
		Log.debug(`Logged in as ${client.user?.tag}!`)

		// Boot the AI scheduling worker — polls nest_scheduled_tasks every 30s
		// to fire DM reminders, channel announcements, and recurring posts.
		try { startScheduler(client) } catch (e) { Log.warn(`[scheduler] start failed: ${(e as Error).message}`) }
	}
}