/* ============================================================
   Automod — messageCreate listener that runs each message
   through the Layer 1 detector modules. Independent of the
   AI handler — runs even when the AI isn't enabled.
============================================================ */
import { Events, Message } from "discord.js"
import { EventOptions } from "../../utils/RegisterEvents"
import { scanMessage } from "../../automod"
import { Log } from "../../utils/logging"

export default {
	name: Events.MessageCreate,
	once: false,
	async execute(_: EventOptions, message: Message) {
		try {
			await scanMessage(message)
		} catch (e) {
			Log.error("[automod] scanMessage crash: " + (e as Error).message)
		}
	},
}
