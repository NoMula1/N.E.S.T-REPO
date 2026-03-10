import { Client, User } from "discord.js"
import { RawUserData } from "discord.js/typings/rawDataTypes"

export default class MockUser extends User {
	constructor(data: RawUserData | null = null) {
		super(undefined as unknown as Client<true>, data ?? {
			id: '000000000000000000',
			username: 'Mock User',
			discriminator: '0',
			global_name: null,
			avatar: null
		} as RawUserData)
	}

	patch(data: RawUserData) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(this as any)._patch(data)
	}
}
