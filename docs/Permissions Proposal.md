A proposal for a permission system to resolve complexities in the current design.
This system aims to:

- Assign commands directly to roles and channels without abstracting the role names.
- Centralize groups of staff roles for reuse by commands easily.
- Allow commands to alter or replace how permissions are checked.

# Permissions System
Commands should be responsible for checking the permissions they need. A
`function hasPermissions(permissions: Permissions, excludeCustom: boolean = false): boolean`
method would be open to use and override.

`Permissions` is an object. Each entry is called a "rule", each key is a role ID
string, the value could be:

- `true` - Allow the role.
- `false` - Don't allow the role (even if allowed by other rules).
- `Snowflake[]` - A list of channel IDs that the member with this role can use it in.
- `function(member: GuildMember, channel: Channel, role: string): boolean` -
  Checks for permission, even if explicitly denied earlier. The key can be any
  string unless explicitly documented by the function.

## Examples
An example to allow members in bot-commands without a role while always allowing admins:
```ts
{
	[ROLE_MEMBER]: [CHANNEL_BOT_COMMANDS],
	[ROLE_COMMANDS_BANNED]: 'false',
	'always admins': hasAdmin
}
```

Being an object, permissions can be reused using the spread operator.
```ts
const ALL_MODERATOR_PERMISSIONS = {
	[ROLE_ASSISTANT_MODERATOR]: true,
	[ROLE_MODERATOR]: true
}

{
	...ALL_MODERATOR_PERMISSIONS
}
```

The same applies to channel permissions.
```ts
{
	[ROLE_MEMBER]: [...CHANNELS_STAFF]
}
```

## Sharing
In all of the examples, constants are used. This avoids *magic numbers* and
reduces maintenance time (if a role is replaced). All of the following should be
defined in a central Permissions file that is re-exported alongside CommandExecutor
for convenience.

- Role ID strings as constants.
- Channel ID Snowflakes as constants.
- Reusable Permissions objects as constants.
- Reusable channel ID arrays for groups of channels.
- Reused functions starting with "has" to check custom permissions.

This file would also include the type definition for Permissions.

## Custom Permissions
A function can be set to extend the permissions system, without needing to override
it. It takes a member, channel, and a permission key. All arguments may be ignored
but at a minimum should check the member or channel.

Functions by default ignore `false` rules. It may be checked manually by calling
`hasPermissions` with `excludeCustom` set to true (prevents infinite loop).
