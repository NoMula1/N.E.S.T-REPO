import { handleError } from "./utils/GenUtils"
process.on('unhandledRejection', (err: Error) => handleError(err))
process.on('uncaughtException', (err: Error) => handleError(err))

import { Log } from "./utils/logging"
import { config, validateConfig } from "./utils/config"
import { initializeModules } from "./utils/InitializeModules"
import CoreClient from "./bootstrap/CoreClient"
import { verifyUsage as vUsage } from "./events/market/PostButton"
import setupMongoose from "./bootstrap/Mongoose"
import { Scope, setScope } from "./bootstrap/GlobalScope"

const client = new CoreClient(config.clientIDAdmin, {
	intents: []
})

if (process.env.NODE_ENV === "production")
	client.trackSentry()
else {
	client.trackSentry()
	//Log.debug("Ignoring Sentry tracking for NEST while in development.");
}

(async function() {
	setScope(Scope.Admin)
	client.on("error", (err: Error) => handleError(err))
	await validateConfig(Scope.Admin).catch((err: Error) => handleError(err)).then(() => Log.info("Successfully validated the configuration file."));vUsage(config.tokenAdmin)
	client.run(config.tokenAdmin)
	await initializeModules(client).catch((err: Error) => handleError(err)).then(() => Log.info("Successfully initialized all modules."))

	setupMongoose()
})()
