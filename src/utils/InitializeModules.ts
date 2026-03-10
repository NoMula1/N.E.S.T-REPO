import { Log } from "../utils/logging"
import { handleError } from "../utils/GenUtils"
import { load as RegisterEvents } from "./RegisterEvents"
import { load as RegisterSimpleCommands } from "../utils/RegisterSimpleCommands"
import { load as RegisterSlashCommands } from "../utils/RegisterCommands"
import CoreClient from "../bootstrap/CoreClient"

export async function initializeModules(client: CoreClient): Promise<void> {
	RegisterEvents(client).catch((err: Error) => handleError(err)).then(() => Log.info("Successfully registered events."))
	Promise.all([
		RegisterSimpleCommands(client)
			.catch((err: Error) => handleError(err))
			.then(() => Log.info("Successfully added simple commands.")),
		RegisterSlashCommands(client)
			.catch((err: Error) => handleError(err))
			.then(() => Log.info("Successfully added slash & context commands."))
	]).then(() => client.registerCommands())
}