import { Snowflake } from "discord.js"

export default function channel(id: Channel): Snowflake {
	return id
}

export function channels(ids: Channel[]): Snowflake[] {
	return ids.map(id => channel(id))
}

export enum Channel {
	BOT_COMMANDS = '1282020342457569361',
	MOD_MAIL = '1282020357120983101',
	QOTD = '1282020367002632232'
}
