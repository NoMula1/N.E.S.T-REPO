import { handleError } from "./utils/GenUtils"
process.on('unhandledRejection', (err: Error) => handleError(err))
process.on('uncaughtException', (err: Error) => handleError(err))

// Test commit - verifying git setup
import { GatewayIntentBits, Partials } from "discord.js"
import { Log } from "./utils/logging"
import { config, validateConfig } from "./utils/config"
import { initializeModules } from "./utils/InitializeModules"
import { load as RegisterFunnyMutes } from "./utils/HandleFunnyMutes"
import CoreClient from "./bootstrap/CoreClient"
import setupMongoose from "./bootstrap/Mongoose"
import { Scope } from "./bootstrap/GlobalScope"

export const client = new CoreClient(config.clientID, {
	intents: [
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions
	],
	partials: [
		Partials.Message,
		Partials.Reaction,
		Partials.Channel
	]
})

if (process.env.NODE_ENV === "production")
	client.trackSentry()
else
	Log.debug("Ignoring Sentry tracking for NEST while in development.");

(async function () {
	client.on("error", (err: Error) => handleError(err))
	await validateConfig(Scope.Default).catch((err: Error) => handleError(err)).then(() => Log.info("Successfully validated the configuration file."))
	client.run(config.token)
	await initializeModules(client).catch((err: Error) => handleError(err)).then(() => Log.info("Successfully initialized all modules."))
	await RegisterFunnyMutes(client).catch((err: Error) => handleError(err)).then(() => Log.info("Successfully registered funny mutes."))

	await setupMongoose().catch((err: Error) => handleError(err)).then(() => Log.info("Database connected successfully."))

	await Promise.all([
		import("./events/autorun/checks/BanCheck"),
		import("./events/autorun/checks/CaseActive"),
		import("./events/ticket/TicketDelete"),
		import("./events/autorun/RoleBans"),
		import("./events/market/PostExpiration"),
		import("./events/autorun/checks/CleanExpiredData"),
		import("./events/autorun/checks/DataErasure"),
		import("./events/market/QueueOwnershipAutoRelease"),
		import("./events/autorun/checks/AutomaticPostBacklog")
		// import("./events/CouncilVote")
	])
})()
