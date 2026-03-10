import { REST, RequestData, RouteLike, InternalRequest, ResponseLike, RequestMethod, Routes, RoleCreateOptions, Snowflake, Role, Events } from "discord.js"
import { Log } from "../../src/utils/logging"
import MockClient from "./MockClient"

interface Action {
	handle(data: object): unknown;
}

interface GuildRoleCreateAction extends Action {
	handle(data: { guild_id: Snowflake, role: RoleCreateOptions; }): { role: Role; };
}

interface ActionsManager {
	[key: string]: Action;
}

export default class MockREST extends REST {
	#client: MockClient
	#guildRoleRegex: RegExp
	#guildMemberRoleRegex: RegExp

	constructor(client: MockClient) {
		super()
		this.#client = client
		this.#guildRoleRegex = new RegExp(Routes.guildRoles('[0-9]+').replace('/', '\\/'))
		this.#guildMemberRoleRegex = new RegExp(Routes.guildMemberRole('([0-9]+)', '([0-9]+)', '([0-9]+)').replace('/', '\\/'))
	}

	async get(fullRoute: RouteLike) {
		Log.debug(`Made ${RequestMethod.Get} request: ${fullRoute}`)
	}

	async delete(fullRoute: RouteLike) {
		Log.debug(`Made ${RequestMethod.Delete} request: ${fullRoute}`)
	}

	async post(fullRoute: RouteLike) {
		Log.debug(`Made ${RequestMethod.Post} request: ${fullRoute}`)
	}

	async put(fullRoute: RouteLike) {
		Log.debug(`Made ${RequestMethod.Put} request: ${fullRoute}`)
	}

	async patch(fullRoute: RouteLike) {
		Log.debug(`Made ${RequestMethod.Patch} request: ${fullRoute}`)
	}

	async request(options: InternalRequest) {
		Log.debug(`Made ${options.method} request: ${options.fullRoute}`)
	}

	//queueRequest(request: InternalRequest): Promise<ResponseLike>; // Requires a IHandler (seems complex, could just do nothing for now)
	async queueRequest(request: InternalRequest): Promise<ResponseLike> {
		//Log.debug(`Queued ${request.method} request: ${request.fullRoute}`)
		throw Error('queueRequest is unimplemented') // Can't be bothered. Implement later
	}
}
