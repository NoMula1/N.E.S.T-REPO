import { BaseChannel, ChannelType, Client } from "discord.js"
import { RawChannelData } from "discord.js/typings/rawDataTypes"

export default class MockBaseChannel extends BaseChannel {
	constructor(data: RawChannelData | undefined = undefined) {
		super(undefined as unknown as Client<true>, data ?? {
			type: ChannelType.GuildText
		} as RawChannelData, true)
	}

	patch(data: RawChannelData) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(this as any)._patch(data)
	}
}
