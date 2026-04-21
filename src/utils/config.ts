import dotENV from "dotenv"
import { Log } from "./logging"
import { Scope } from "../bootstrap/GlobalScope"
import { readFileSync } from "node:fs"

let configFile: any = {}
try {
	configFile = JSON.parse(readFileSync("./config.json", "utf8"))
	console.log("✅ Config loaded:", JSON.stringify(configFile, null, 2))
} catch (err) {
	console.log("config.json not found, skipping. " + err) // fixme: Log complains timeStringNow does not exist
}

dotENV.config()
export const config = {
	// Shared
	successEmoji: (configFile.successEmoji ?? process.env.SUCCESS_EMOJI ?? "✅") as string,
	failedEmoji: (configFile.failedEmoji ?? process.env.FAILED_EMOJI ?? "❌") as string,
	arrowEmoji: (configFile.arrowEmoji ?? process.env.ARROW_EMOJI ?? "➡️") as string,
	bulletpointEmoji: (configFile.bulletpointEmoji ?? process.env.BULLETPOINT_EMOJI ?? "•") as string,
	loadingEmoji: (configFile.loadingEmoji ?? process.env.LOADING_EMOJI ?? "↻") as string,
	warnEmoji: (configFile.warnEmoji ?? process.env.WARN_EMOJI ?? "⚠️") as string,
	devs: (configFile.devs || ["1149913737558499358", "1009717580270948372"]) as string[],
	mongo_uri: process.env.MONGO_URI as string,
	error_webhook_url: process.env.ERROR_WEBHOOK_URL as string,
	// Default
	clientID: (configFile.clientID ?? process.env.CLIENT_ID) as string,
	token: process.env.TOKEN as string,
	// Admin
	clientIDAdmin: (configFile.clientIDAdmin ?? process.env.CLIENT_ID_ADMIN) as string,
	tokenAdmin: process.env.TOKEN_ADMIN as string,
}

export async function validateConfig(scope: Scope) {

	switch (scope) {
		case Scope.Admin:
			if (!config.clientIDAdmin) {
				Log.error("You are missing the \"CLIENT_ID_ADMIN\" argument in config.json. Slash commands will not work.")
			}
			if (!config.tokenAdmin) {
				Log.warn("You are missing the \"TOKEN_ADMIN\" environment variable! Starting NEST Admin will not work correctly.")
			}
			break
		default:
			if (!config.clientID) {
				Log.error("You are missing the \"CLIENT_ID\" argument in config.json. Slash commands will not work.")
			}
			if (!config.token) {
				Log.error("You are missing the \"TOKEN\" evironment variable! Make sure you have a .env file with the token in it.")
			}
			break
	}

	if (!config.successEmoji) {
		Log.warn("You are missing the \"successEmoji\" argument in config.json. Some emojis may not work.")
	}
	if (!config.failedEmoji) {
		Log.warn("You are missing the \"failedEmoji\" argument in config.json. Some emojis may not work.")
	}
	if (!config.arrowEmoji) {
		Log.warn("You are missing the \"arrowEmoji\" argument in config.json. Some emojis may not work.")
	}
	if (!config.bulletpointEmoji) {
		Log.warn("You are missing the \"bulletpointEmoji\" argument in config.json. Some emojis may not work.")
	}
	if (!config.loadingEmoji) {
		Log.warn("You are missing the \"loadingEmoji\" argument in config.json. Some emojis may not work.")
	}
	if (!config.warnEmoji) {
		Log.warn("You are missing the \"warnEmoji\" argument in config.json. Some emojis may not work.")
	}
	if (!config.devs) {
		Log.warn("You are missing the \"devs\" array argument in config.json. PermissionLevel.Developer will not function.")
	}
	if (!config.mongo_uri) {
		Log.error("You are missing the \"MONGO_URI\" evironment variable! Make sure you have a .env file with the mongo uri in it.")
	}
	if (!config.error_webhook_url) {
		Log.error("You are missing the \"ERROR_WEBHOOK_URL\" evironment variable! Error handling will not function without.")
	}

}
