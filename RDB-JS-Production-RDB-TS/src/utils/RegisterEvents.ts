/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path"
import { Scope, scope } from "../bootstrap/GlobalScope"
import CoreClient from "../bootstrap/CoreClient"
import { sync } from 'glob'
export interface Event {
	name?: string,
	once?: boolean,
	scope?: Scope,
	execute?(options: EventOptions, ...args: any): any,
	[onEvent: string]: any | ((options: EventOptions, ...args: any) => any)
}

export interface EventOptions {
	client: CoreClient
}

export async function load(client: CoreClient) {
	const eventPath = path.join(__dirname, "..", "events")
	const eventFiles = sync('**/*.ts', {
		cwd: eventPath,
		nodir: true,
		absolute: false
	})

	for (const file of eventFiles) {
		const filePath = path.join(eventPath, file)
		const event = (await import(filePath)).default as Event

		if (!event?.execute) continue // Avoid non-event objects

		if (event?.scope ?? Scope.Default === scope) {
			if (event.name) {
				if (event.once) {
					client.once(event.name, (...args: any) =>
						event.execute!(createOptions(client, ...args), ...args))
				} else {
					client.on(event.name, (...args: any) =>
						event.execute!(createOptions(client, ...args), ...args))
				}
			}

			for (const [eventName, eventFunc] of Object.entries(event)) {
				if (eventName.startsWith("on") && typeof eventFunc === "function") {
					const formalEventName = eventName.substring(2, 2).toLowerCase() + eventName.substring(3)
					client.on(formalEventName, (...args: any) =>
						eventFunc(createOptions(client, ...args), ...args))
				}
			}
		}
	}
}

function createOptions(client: CoreClient, ..._args: any): EventOptions {
	return {
		client
	}
}
