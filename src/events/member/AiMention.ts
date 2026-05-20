/* ============================================================
   NightHawk AI — Discord event listener
   Fires on every messageCreate, but does nothing unless the bot
   is @-mentioned. Delegates the heavy lifting to src/ai/handler.
============================================================ */
import { Events, Message } from "discord.js"
import { EventOptions } from "../../utils/RegisterEvents"
import { handleAiMention } from "../../ai/handler"
import { Log } from "../../utils/logging"

export default {
	name: Events.MessageCreate,
	once: false,
	async execute(_: EventOptions, message: Message) {
		try {
			if (message.author.bot) return
			const botId = message.client.user?.id
			if (!botId) return
			// Only fire when the bot is explicitly @-mentioned
			if (!message.mentions.users.has(botId)) return
			// Ignore @everyone / @here mentions that incidentally include the bot
			if (message.mentions.everyone) return

			await handleAiMention(message)
		} catch (e) {
			Log.error("[NightHawk-AI] dispatcher crash: " + (e as Error).message)
		}
	},
}
