import { ApplicationCommandOptionType } from "discord.js"
import dotENV from "dotenv"
import fs from "fs"
import path from "path"
import { Log } from "../utils/logging"
import { CommandExecutor } from "./CommandExecutor"
import { createNewGuildFile, handleError } from "../utils/GenUtils"
import Settings from "../schemas/Settings"
import { ContextCommandExecutor } from "./ContextCommandExecutor"
import CoreClient from "../bootstrap/CoreClient"
import { scope } from "../bootstrap/GlobalScope"
dotENV.config()

export async function load(client: CoreClient) {
	//SLASH COMMANDS
	const commandPath = path.join(__dirname, "..", "commands", "slash")
	const commandFolders = fs.readdirSync(commandPath)
	for (const folder of commandFolders) {
		const commandFiles = fs.readdirSync(`${commandPath}/${folder}`).filter(file => file.endsWith(".ts"))

		for (const file of commandFiles) {
			const command = (await import(`${commandPath}/${folder}/${file}`).catch(err => {
				Log.error(`[Error] | Slash Command | ${file} | Unable to import: ${err}`)
				return null
			}))?.default as CommandExecutor | null
			await new Promise((resolve) => setTimeout(resolve, 10)) // delay
			if (!command) continue
			if (command.scope !== scope) continue

			//Log.debug(`[Get] | Slash Command | ${file}`);

			client.slashcommands.set(command.name, command)

			//Log.debug(`[Loaded]  | Slash Command | ${file}`);
		}
	}

	//CONTEXT COMMANDS
	const contextPath = path.join(__dirname, "..", "commands", "context")
	const contextFolders = fs.readdirSync(contextPath)
	for (const folder of contextFolders) {
		const commandFiles = fs.readdirSync(`${contextPath}/${folder}`).filter(file => file.endsWith(".ts"))

		for (const file of commandFiles) {
			const command = (await import(`${contextPath}/${folder}/${file}`).catch(err => {
				Log.error(`[Error] | Slash Command | ${file} | Unable to import: ${err}`)
				return null
			}))?.default as ContextCommandExecutor<unknown> | null
			await new Promise((resolve) => setTimeout(resolve, 10)) // delay
			if (!command) continue
			if (command.scope !== scope) continue

			//Log.debug(`[Get] | Context Command | ${file}`);

			client.contextcommands.set(command.name, command)

			//Log.debug(`[Loaded]  | Context Command | ${file}`);
		}
	}

	client.on("interactionCreate", async interaction => {
		if (interaction.isChatInputCommand()) {
			const command = client.slashcommands.get(interaction.commandName)
			if (interaction.inCachedGuild()) {
				const settings = await Settings.findOne({
					guildID: interaction.guild?.id
				})
				if (!settings) {
					await createNewGuildFile(interaction.guild)
				}
			}

			Log.debug(`${interaction.guild?.name ?? "non-guild"} > ${interaction.user.username} > /${interaction.commandName} ${interaction.options.data.map((option) => { return `${option.name} [${ApplicationCommandOptionType[option.type]}]: ${option.value}` })}`)


			if (!command) return

			try {
				const permResult = await command.hasPermission(interaction)
				if (permResult.success == false) {
					await interaction.reply({ content: permResult.content || "You are not authorized to execute this command.", ephemeral: true })
					return
				}
				await command.execute(interaction)
			} catch (error) {
				console.error(error)
				await interaction
					.reply({ content: 'There was an error while executing this command!', ephemeral: true })
					.catch((err: Error) => handleError(err))
			}

		} else if (interaction.isContextMenuCommand()) {
			const command = client.contextcommands.get(interaction.commandName)

			if (!command) return

			try {
				const permResult = await command.hasPermission(interaction)
				if (permResult.success == false) {
					await interaction.reply({ content: permResult.content || "You are not authorized to execute this command.", ephemeral: true })
					return
				}
				await command.execute(interaction)
			} catch (error) {
				console.error(error)
				await interaction
					.reply({ content: 'There was an error while executing this command!', ephemeral: true })
					.catch((err: Error) => handleError(err))
			}
		}
	})
}