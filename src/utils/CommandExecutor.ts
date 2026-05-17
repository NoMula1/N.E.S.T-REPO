import { ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBooleanOption, SlashCommandBuilder } from 'discord.js'
import { config } from '../utils/config'
import { SlashCommandChannelOption, SlashCommandIntegerOption, SlashCommandNumberOption, SlashCommandRoleOption, SlashCommandStringOption, SlashCommandUserOption } from '@discordjs/builders'
import { getGuildConfig } from '../utils/GuildConfigCache'
import { GuildRoles } from '../schemas/GuildConfig'


/**
 * Permission type for commands.
 * @param {PermissionLevel} Level Level for command use.
 * @param {string[]} HasRole Array of Role IDs required to use a command.
 * @param {string[]} IsUser Array of User IDs required to use a command.
 * @param {string[]} NotRole Array of Role IDs that a user must not have to use a command.
 * @param {string[]} NotUser Array of User IDs disallowed from using a command.
 */
export type Permission = {
	/** Permission level required for the command. */
	Level: PermissionLevel,
	/** Bot scope — legacy, no longer used. Kept for backwards compatibility. */
	Scope?: number,
	/** Has any of the roles in the array */
	HasRole?: string[],
	/** Does not have any of the roles in the array, which would override the above argument. */
	NotRole?: string[];
	/** Is any of the users in the array. */
	IsUser?: string[],
	/** Is not any of the users in the array. */
	NotUser?: string[],
}

/**
 * Permission level for commands.
 * @enum {PermissionLevel} Level for command use.
 */
export enum PermissionLevel {
	/** No permission required to use the command. */
	None,
	/** Requires the Trial Market Moderator role. */
	MarketStaff,
	/** Requires the Trial Help Moderator Role */
	TrialHelpModerator,
	/** Requires the Help Moderator role. */
	HelpModerator,
	/** Requires the Market Moderator role. */
	MarketModerator,
	/** Requires the Help Manager role. */
	HelpManager,
	/** Requires the Assistant Moderator role. */
	AssistantModerator,
	/** Requires the Moderator role. */
	Moderator,
	/** Requires the Senior Moderator role. */
	SeniorModerator,
	/** Requires the Senior Market Moderator role. */
	SeniorMarketModerator,
	/** Requires the Assistant Administrator role. */
	AssistantAdministrator,
	/** Requires the Market Manager role. */
	MarketManager,
	/** Requires the Administrator role. */
	Administrator,
	/** Must be a part of the devs array in config.json. */
	Developer,
}

const LEVEL_ROLE_MAP: Partial<Record<PermissionLevel, { key: keyof GuildRoles; message: string }>> = {
	[PermissionLevel.MarketStaff]:            { key: 'MarketStaff',            message: 'You must be Trial Market Moderator and up to use this command.' },
	[PermissionLevel.TrialHelpModerator]:     { key: 'TrialHelpModerator',     message: 'You must be Trial Help Moderator and up to use this command.' },
	[PermissionLevel.HelpModerator]:          { key: 'HelpModerator',          message: 'You must be Help Moderator and up to use this command.' },
	[PermissionLevel.MarketModerator]:        { key: 'MarketModerator',        message: 'You must be Market Moderator and up to use this command.' },
	[PermissionLevel.HelpManager]:            { key: 'HelpManager',            message: 'You must be Help Manager and up to use this command.' },
	[PermissionLevel.AssistantModerator]:     { key: 'AssistantModerator',     message: 'You must be Assistant Moderator and up to use this command.' },
	[PermissionLevel.Moderator]:              { key: 'Moderator',              message: 'You must be Moderator and up to use this command.' },
	[PermissionLevel.SeniorModerator]:        { key: 'SeniorModerator',        message: 'You must be Senior Moderator and up to use this command.' },
	[PermissionLevel.SeniorMarketModerator]:  { key: 'SeniorMarketModerator',  message: 'You must be Senior Market Moderator and up to use this command.' },
	[PermissionLevel.AssistantAdministrator]: { key: 'AssistantAdministrator', message: 'You must be Assistant Administrator and up to use this command.' },
	[PermissionLevel.MarketManager]:          { key: 'MarketManager',          message: 'You must be Market Manager and up to use this command.' },
	[PermissionLevel.Administrator]:          { key: 'Administrator',          message: 'You must be Administrator and up to use this command.' },
}

/** The main action of a command. */
type Executor = (interaction: ChatInputCommandInteraction) => Promise<void> | void

/** The results of checking user permissions. */
interface PermissionsResult extends InteractionReplyOptions {
	success: boolean;
}

/** A user-facing command. */
export class CommandExecutor extends SlashCommandBuilder {
	#executor: Executor
	#base_permission: Permission
	#disabled: boolean
	constructor() {
		super()
		this.#executor = function () {
			throw new Error('Command executor unimplemented (call setExecutor before exporting commands)')
		}
		this.#base_permission = { Level: PermissionLevel.None }
		this.#disabled = false
	}

	/**
	 * Sets the {@link executor}.
	 * @param executor The actual executor.
	 * @returns {NESTCommand}
	*/
	setExecutor(executor: Executor): CommandExecutor {
		this.#executor = executor
		return this
	}
	/* Sets whether or not the command is disabled or not*/
	setDisabled(disabled: boolean): CommandExecutor {
		this.#disabled = disabled
		return this
	}
	/** Sets the base permissions that will always apply to the command. */
	setBasePermission(permission: Permission): CommandExecutor {
		this.#base_permission = permission
		return this
	}
	/**
	 * Sets the name of the command
	 *
	 * @param name - The name of the command
	 */
	setName(name: string): this {
		super.setName(name)
		return this
	}
	/**
	 * Sets the description of the command
	 *
	 * @param description - The description of the command
	 */
	setDescription(description: string): this {
		super.setDescription(description)
		return this
	}
	/**
	 * Adds a string option.
	 *
	 * @param input - A function that returns an option builder or an already built builder
	 */
	addStringOption(input: SlashCommandStringOption | ((builder: SlashCommandStringOption) => SlashCommandStringOption)): this {
		super.addStringOption(input)
		return this
	}
	/**
	 * Adds a boolean option.
	 *
	 * @param input - A function that returns an option builder or an already built builder
	 */
	addBooleanOption(input: SlashCommandBooleanOption | ((builder: SlashCommandBooleanOption) => SlashCommandBooleanOption)): this {
		super.addBooleanOption(input)
		return this
	}
	/**
	 * Adds a user option.
	 *
	 * @param input - A function that returns an option builder or an already built builder
	 */
	addUserOption(input: SlashCommandUserOption | ((builder: SlashCommandUserOption) => SlashCommandUserOption)): this {
		super.addUserOption(input)
		return this
	}
	/**
	 * Adds a role option.
	 *
	 * @param input - A function that returns an option builder or an already built builder
	 */
	addRoleOption(input: SlashCommandRoleOption | ((builder: SlashCommandRoleOption) => SlashCommandRoleOption)): CommandExecutor {
		super.addRoleOption(input)
		return this
	}
	/**
	 * Adds an integer option.
	 *
	 * @param input - A function that returns an option builder or an already built builder
	 */
	addIntegerOption(input: SlashCommandIntegerOption | ((builder: SlashCommandIntegerOption) => SlashCommandIntegerOption)): this {
		super.addIntegerOption(input)
		return this
	};
	/**
	 * Adds a number option.
	 *
	 * @param input - A function that returns an option builder or an already built builder
	 */
	addNumberOption(input: SlashCommandNumberOption | ((builder: SlashCommandNumberOption) => SlashCommandNumberOption)): this {
		super.addNumberOption(input)
		return this
	};
	/**
	 * Adds a channel option.
	 *
	 * @param input - A function that returns an option builder or an already built builder
	 */
	addChannelOption(input: SlashCommandChannelOption | ((builder: SlashCommandChannelOption) => SlashCommandChannelOption)): this {
		super.addChannelOption(input)
		return this
	};
	/**
	 * Checks if the user has permission to run this command.
	 * @param {Interaction} interaction
	 * @returns The result of checking if the user has permission to run the command.
	 */
	async hasPermission(interaction: ChatInputCommandInteraction): Promise<PermissionsResult> {
		if (!interaction.inCachedGuild()) return { success: false, content: "You must use this in a guild." }

		if (!this.#base_permission.NotRole) this.#base_permission.NotRole = []
		if (!this.#base_permission.NotUser) this.#base_permission.NotUser = []
		if (!this.#base_permission.HasRole) this.#base_permission.HasRole = []
		if (!this.#base_permission.IsUser) this.#base_permission.IsUser = []

		if (this.disabled) {
			return {
				success: false,
				content: `This command has been disabled. Please contact a Bot Developer if you believe this is an error.`
			}
		}

		for (const user of this.#base_permission.NotUser) {
			if (interaction.user.id === user) {
				return {
					success: false,
					content: "You are not allowed to run this command."
				}
			}
		}
		for (const role of this.#base_permission.NotRole) {
			if (interaction.member.roles.cache.has(role)) {
				return {
					success: false,
					content: "You are not allowed to run this command."
				}
			}
		}

		for (const role of this.#base_permission.HasRole) {
			if (interaction.member.roles.cache.has(role)) {
				return {
					success: true
				}
			}
		}
		for (const user of this.#base_permission.IsUser) {
			if (interaction.user.id === user) {
				return {
					success: true
				}
			}
		}

		const level = this.#base_permission.Level
		if (level === PermissionLevel.None) return { success: true }
		if (level === PermissionLevel.Developer) {
			const isDev = config.devs.includes(interaction.user.id)
			if (!isDev) return { success: false, content: 'You must be a NEST developer to use this command.' }
			return { success: true }
		}

		const mapping = LEVEL_ROLE_MAP[level]
		if (!mapping) return { success: false, content: "You aren't authorized to use this command." }

		const guildConfig = await getGuildConfig(interaction.guildId!)
		const roleId = guildConfig?.roles?.[mapping.key]
		if (!roleId) return { success: false, content: `This server hasn't configured the ${mapping.key} role yet. Run /setup or configure roles in the NEST dashboard.` }
		if (!interaction.member.roles.cache.has(roleId)) return { success: false, content: mapping.message }
		return { success: true }
	}

	/** Runs the current {@link Executor}. */
	execute(interaction: ChatInputCommandInteraction): Promise<unknown> {
		return this.#executor(interaction) ?? Promise.resolve()
	}

	get disabled(): boolean {
		return this.#disabled ?? false
	}
}
