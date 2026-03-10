import { Log } from "../../utils/logging"
import mongoose from "mongoose"
import { ActivityType, Client, Events } from "discord.js"
import { EventOptions } from "../../utils/RegisterEvents"

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
	}
}