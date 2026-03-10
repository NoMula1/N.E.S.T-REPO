import fs from "fs"
import path from "path"
import { Log } from "../utils/logging"
import { handleError } from "../utils/GenUtils"
import { scope } from "../bootstrap/GlobalScope"
import CoreClient from "../bootstrap/CoreClient"
import { SimpleCommand } from "./SimpleCommandExecutor"

export async function load(client: CoreClient) {
	return
	//SIMPLE COMMANDS
	const commandPath = path.join(__dirname, "..", "commands", "simple")
	const commandFiles = fs.readdirSync(commandPath)
	for (const commandFile of commandFiles) {
		if (!commandFile.endsWith('.md')) continue

		const command = new SimpleCommand(
			commandFile.substring(0, commandFile.indexOf('.')),
			fs.readFileSync(`${commandPath}/${commandFile}`, 'utf-8'))
		await new Promise((resolve) => setTimeout(resolve, 10)) // delay
		if (command.scope !== scope) continue

		Log.debug(`[Get] | Simple Command | ${commandFile}`)

		client.simplecommands.set(command.name, command)

		Log.debug(`[Loaded]  | Simple Command | ${command.name}`)
	}

	client.on("interactionCreate", async interaction => {
		if (!interaction.isChatInputCommand()) return

		const command = client.simplecommands.get(interaction.commandName)

		if (!command) return
		if (command.scope !== scope) return

		try {
			// TODO: Define permissions for simple commands
			if (false) {
				// TODO: Warn the user
				//await interaction.reply({ content: permResult.content || "You are not authorized to execute this command.", ephemeral: true });
				return
			}
			await command.executeInteraction(interaction)
		} catch (error) {
			Log.error(error)
			await interaction
				.reply({ content: 'There was an error while executing this simple command!' })
				.catch((err: Error) => handleError(err))
		}
	})
	client.on('messageCreate', async message => {
		if (!message.content.startsWith(';')) return

		// todo: This, ugly! Need to refactor
		// Based on: https://stackoverflow.com/a/46946420
		// Licensed under CC BY-SA 3.0
		const args: string[] = (message.content.substring(1) ?? '')
			.match(/\\?.|^$/g)
			?.reduce((p: any, c) => {
				if (c === '"')
					p.quote ^= 1
				else if (!p.quote && c === ' ')
					p.a.push('')
				else
					p.a[p.a.length-1] += c.replace(/\\(.)/, '$1')
				return p
			}, {a: ['']}).a
		const command = client.simplecommands.get(args[0])

		if (!command) return
		if (command.scope !== scope) return

		try {
			// TODO: Define permissions for simple commands
			if (false) {
				// TODO: Warn the user
				//await message.reply({ content: permResult.content || "You are not authorized to execute this command.", ephemeral: true });
				return
			}
			await command.executeMessage(message, args)
		} catch (error) {
			Log.error(error)
			await message
				.reply({ content: 'There was an error while executing this simple command!' })
				.catch((err: Error) => handleError(err))
		}
	})
}