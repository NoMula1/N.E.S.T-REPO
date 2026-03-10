A replacement for previous methods to identify channels. The goal being to
allow channels to be renamed and uniquely identified without breaking code.

# Channels module
The channels module will export a default function which takes an enum and
returns a Snowflake: `function channel(id: Channel): Snowflake`

The source of the Snowflake is intentionally obscure. This will allow channel
snowflakes to be dynamically set (through a command or website). The Channel enum
will be a string enum containing the channel Snowflake. This should not be relied
on and could change at any time.

An example module has been provided in utils:
```ts
const botsChannel: Snowflake = channel(Channel.BOT_COMMANDS)
```
