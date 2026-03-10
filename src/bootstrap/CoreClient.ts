import { Client, ClientOptions, Collection, Events, GatewayIntentBits, Partials, REST, Routes } from "discord.js"
import { Log } from "../utils/logging"
import { scope, toString as scopeToString } from "./GlobalScope"
import * as Sentry from "@sentry/bun"
import { CommandExecutor } from "../utils/CommandExecutor"
import { ContextCommandExecutor } from "../utils/ContextCommandExecutor"
import { SimpleCommand } from "../utils/SimpleCommandExecutor"

export default class CoreClient extends Client {
	/** The global client instance (use if you aren't provided a client). */
	static instance: CoreClient
	#clientId: string
	#interactionsPerHour: number

	slashcommands = new Collection<string, CommandExecutor>
	contextcommands = new Collection<string, ContextCommandExecutor<unknown>>
	simplecommands = new Collection<string, SimpleCommand>

	constructor(clientId: string, options: ClientOptions) {
		const intents = [
			GatewayIntentBits.GuildMembers,
			GatewayIntentBits.GuildMessageReactions,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.Guilds,
			GatewayIntentBits.MessageContent
		]
		const partials = [
			Partials.Message,
			Partials.Reaction,
			Partials.GuildMember,
			Partials.Channel
		]
		if (options.intents instanceof Array)
			intents.push.apply(intents, options.intents as Array<any>)
		if (options.partials instanceof Array)
			partials.push.apply(partials, options.partials as Array<any>)
		super({
			...options,
			intents,
			partials 
		})
		this.#clientId = clientId
		this.#interactionsPerHour = 0
		CoreClient.instance = this
	}

	/** Starts the client. */
	async run(token: string): Promise<void> {
		try {
			await this.login(token)
			Log.info(`NEST Started (scope: ${scopeToString(scope)})`)
		} catch (e) {
			console.log('Error starting NEST')
			console.error(e)
		}
	}

	async registerCommands() {
		const rest = new REST({ version: '10' }).setToken(this.token!);
		const toRegister = [
			...this.slashcommands.values(),
			...this.contextcommands.values(),
			...this.simplecommands.values()]

		try {
			Log.info(`Registering all commands (${toRegister.length}).`)
			// console.log(toRegister)

			await rest.put(
				Routes.applicationCommands(this.#clientId),
				{ body: toRegister.map(command => command.toJSON()) })

			Log.info("Registered all commands")
		} catch (error) {
			Log.error("Failed to register commands: " + error)
		}
	}

	get clientId(): string {
		return this.#clientId
	}

	trackSentry() {
		Sentry.init({
			dsn: "https://337753ad7c1fc754e6e82204055b6061@o4508180113915904.ingest.us.sentry.io/4508180116144128",
			environment: this.#clientId,
			// Tracing
			tracesSampleRate: 1.0, //  Capture 100% of the transactions
		})
	}

	trackInteractions() {
		const increment = () => {
			this.#interactionsPerHour++
			setTimeout(() => {
				this.#interactionsPerHour--
			}, 3600000) // 1 hour
		}
		addEventListener(Events.MessageCreate, increment)
		addEventListener(Events.InteractionCreate, increment)
	}

	get interactionsPerHour(): number {
		return this.#interactionsPerHour
	}
}
