/* ============================================================
   NightHawk AI — Discord event listener
   Fires on every messageCreate. Routes to the AI handler when:
   - The bot is @-mentioned, OR
   - The user already has an active conversation session in this
     channel (started by a previous @-mention)
   Sessions close on "farewell" or after 5 min idle.
============================================================ */
import { Events, Message } from "discord.js"
import { EventOptions } from "../../utils/RegisterEvents"
import { handleAiMention } from "../../ai/handler"
import { getSession } from "../../ai/sessions"
import { Log } from "../../utils/logging"

export default {
	name: Events.MessageCreate,
	once: false,
	async execute(_: EventOptions, message: Message) {
		try {
			if (message.author.bot) return
			const botId = message.client.user?.id
			if (!botId) return
			if (!message.guildId) return

			// Ignore @everyone / @here mentions that incidentally include the bot
			if (message.mentions.everyone) return

			const wasMentioned = message.mentions.users.has(botId)
			const hasActiveSession = !!getSession(message.guildId, message.channelId, message.author.id)

			// Only fire when explicitly @-mentioned OR there's an active session
			if (!wasMentioned && !hasActiveSession) return

			await handleAiMention(message)
		} catch (e) {
			Log.error("[NightHawk-AI] dispatcher crash: " + (e as Error).message)
		}
	},
}
