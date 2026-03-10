import { Log } from "../../utils/logging"
import mongoose from "mongoose"
import { ActivityType, Events } from "discord.js"
import { fastFlagList } from "../../utils/fastFlags"
import FastFlag from "../../schemas/FastFlag"

export default {
	name: Events.ClientReady,
	once: true,
	async execute() {
		Log.info('Loading fast flags')

		for await (const flag of fastFlagList) {
			const foundData = await FastFlag.findOne({
				refName: flag.refName
			})

			if (!foundData) {
				Log.info('Creating uninitialized fastflag ' + flag.refName)

				await FastFlag.create(flag)
			}
		}

		Log.info('Finished loading fast flags')
	}
}