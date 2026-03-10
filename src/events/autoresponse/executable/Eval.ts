import { CategoryChannel, ChannelType, EmbedBuilder, Events, Message, TextChannel } from "discord.js"
import fs from "fs"
import { config } from "dotenv"
config()
import path, { resolve } from "path"
import RoleBans from "../../../schemas/RoleBans"
import Bans from "../../../schemas/Bans"
import Case from "../../../schemas/Case"
import FastFlag from "../../../schemas/FastFlag"
import FurryConfig from "../../../schemas/FurryConfig"
import FurryImage from "../../../schemas/FurryImage"
import FurryPage from "../../../schemas/FurryPage"
import Post from "../../../schemas/Post"
import PostTemplates from "../../../schemas/PostTemplates"
import PostTemplateChanges from "../../../schemas/PostTemplateChanges"
import Settings from "../../../schemas/Settings"
import Tickets from "../../../schemas/Tickets"
import TicketStatus from "../../../schemas/TicketStatus"
import { EventOptions } from "../../../utils/RegisterEvents"
import { client } from "../../../Core"

export default {
	name: Events.MessageCreate,
	once: false,
	async execute(_: EventOptions, message: Message) {
		if (message.content.startsWith("^eval")) {
			if (!process.env.EVAL_EXPLICIT_ID)
				return
			if (process.env.EVAL_EXPLICIT_ID !== message.author.id && message.author.id !== '0000000000000')
				return

			const codeBlockRegex = /```(?:([a-zA-Z0-9]+)\n)?(?<code>[\s\S]*?)^```/m

			const regexMatch = message.content.match(codeBlockRegex)
			if (regexMatch && regexMatch.groups && regexMatch.groups.code) {
				const start = Date.now()
				const now = process.hrtime.bigint()
				let evaluatedFunctionResult: any | undefined = undefined
				try {
					const imports = {
						client: client,
						fs: fs,
						data: {
							Bans,
							Case,
							FastFlag,
							FurryConfig,
							FurryImage,
							FurryPage,
							Post,
							PostTemplateChanges,
							PostTemplates,
							RoleBans,
							Settings,
							Tickets,
							TicketStatus
						}
					}
					evaluatedFunctionResult = await (new Function('imports', `return async function() { ${regexMatch.groups.code} }`)(imports))()
					// console.log(evaluatedFunctionResult)
				} catch (err: any) {
					const safeError = err.toString().replaceAll(message.client.token, "[REDACTED: Bot Token]")
					await message.reply({
						embeds: [
							new EmbedBuilder()
								.setTitle("Evaluation Result")
								.setFooter({ text: 'Evaluation requested by ' + message.author.displayName })
								.setColor("Red")
								.setDescription(`**__Evaluation Failed__**\n\nError: \`\`\`\n${safeError}\n\`\`\``)
						]
					})
					return
				}
				const end = Date.now()
				const endHighRes = process.hrtime.bigint()
				// strip token
				if (evaluatedFunctionResult !== undefined) {
					evaluatedFunctionResult = evaluatedFunctionResult.toString()
					evaluatedFunctionResult = evaluatedFunctionResult.replaceAll(message.client.token, "[REDACTED: Bot Token]")
				}

				await message.reply({
					embeds: [
						new EmbedBuilder()
							.setTitle("Evaluation Result")
							.setFooter({ text: 'Evaluation requested by ' + message.author.displayName })
							.setColor("Green")
							.setDescription(`**__Evaluation Passed__**\n\nEvaluation result: \`\`\`bash\n${evaluatedFunctionResult ?? "$ No Returned Expression"}\n\`\`\`\n\n*Evaluated in ${(end - start) / 1000}sec (${end - start} millis  |  ${endHighRes - now} nanos) *`)
					]
				})
				return

			} else {
				await message.reply(`Could not find codeblock, or it is formatted incorrectly. Please format correctly.`).catch((err) => { }).then(() => {
					message.delete().catch(() => { })
				})
				return
			}
		}
	}
}