import { Snowflake } from "discord.js"

export default function channel(id: Channel): Snowflake {
	return id
}

export function channels(ids: Channel[]): Snowflake[] {
	return ids.map(id => channel(id))
}

export enum Channel {
	BOT_COMMANDS = '1403396269589794827',
	MOD_MAIL = '1480795474137972746',
	QOTD = '1480800774123557059'
}
