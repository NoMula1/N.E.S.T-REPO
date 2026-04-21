import { Snowflake } from "discord.js"

export default function channel(id: Channel): Snowflake {
	return id
}

export function channels(ids: Channel[]): Snowflake[] {
	return ids.map(id => channel(id))
}

export enum Channel {
	BOT_COMMANDS = 'CHANNELIDCHANGE',
	MOD_MAIL = 'CHANNELIDCHANGE',
	QOTD = 'CHANNELIDCHANGE'
}