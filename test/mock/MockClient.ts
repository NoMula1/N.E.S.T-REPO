import { Client, ClientOptions, GatewayIntentBits } from "discord.js"
import { Log } from "../../src/utils/logging"
import MockREST from "./MockREST"

export default class MockClient extends Client<true> {
	static #unmockedEnv: NodeJS.ProcessEnv

	constructor() {
		super({
			intents: Object.values(GatewayIntentBits)
		} as ClientOptions)
		this.rest = new MockREST(this)
	}

	static async prepareEnv() {
		const workers = await import('node:worker_threads')
		MockClient.#unmockedEnv = process.env ?? workers.workerData
		if (workers.workerData) {
			Log.info('workerData set, will replace for the MockClient!')
			workers.workerData = MockClient.mockEnv
		}
		Log.info('Will replace process.env for the MockClient!')
		process.env = MockClient.mockEnv
	}

	static async unprepareEnv() {
		const workers = await import('node:worker_threads')
		if (workers.workerData) {
			Log.info('Restoring workerData')
			workers.workerData = MockClient.#unmockedEnv
		}
		Log.info('Restoring process.env')
		process.env = MockClient.#unmockedEnv
	}

	static get mockEnv(): NodeJS.ProcessEnv {
		// Nothing for now
		return {}
	}

	get mockrest(): MockREST {
		return this.rest as MockREST
	}
}
