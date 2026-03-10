import { ChatInputCommandInteraction, InteractionReplyOptions, Role, SlashCommandBooleanOption, SlashCommandBuilder } from 'discord.js'
import { config } from '../utils/config'
import { Scope, scope, toString as scopeToString, setScope } from '../bootstrap/GlobalScope'
import { SlashCommandChannelOption, SlashCommandIntegerOption, SlashCommandNumberOption, SlashCommandRoleOption, SlashCommandStringOption, SlashCommandUserOption } from '@discordjs/builders'


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
	/** Bot scope required for the command. */
	Scope?: Scope,
	/** Has any of the roles in the array */
	HasRole?: string[],
	/** Does not have any of the roles in the array, which would override the above argument. */
	NotRole?: string[];
	/** Is any of the users in the array. */
	IsUser?: string[],
	/** Is not any of the users in the array. */
	NotUser?: string[],
}
export const RoleIDS = {
	MarketStaff: '1480436503187423342', // Marketplace Department (base staff role)
	TrialHelpModerator: '1480437092361175163', // Trial Help Moderator
	HelpModerator: '1480436761938104380', // Help Moderator
	MarketModerator: '1480435758845395045', // Marketplace Moderator
	MarketManager: '1480435906044362814', // Marketplace Manager
	HelpManager: '1480436823984705557', // Help Forums Manager
	ScamInvestigator: '1474515140841046231', // Scam Investigator
	TrialScamInvestigator: '1474515390418780330', // Trial Scam Investigator
	ScamInvestigationsManager: '1474514887609680124', // Scam Investigations Manager
	AssistantModerator: '1392220113909846018', // Trial Moderator
	Moderator: '1406065795464822917', // Moderator
	SeniorModerator: '1413957083598164008', // Senior Moderator
	SeniorMarketModerator: '1480436288296583228', // Senior Marketplace Moderator
	AssistantAdministrator: '1390774033586458745', // Senior Community Moderator / Assistant Administrator
	Administrator: '1473948752720040087', // Server Manager / Administrator
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
		/*
		if (!(interaction.member?.permissions as Readonly<PermissionsBitField>)?.has([
			PermissionsBitField.Flags.SendMessages,
			PermissionsBitField.Flags.EmbedLinks])) {
			return {
				success: false
			};
		}
		*/
		if (!this.#base_permission.NotRole) this.#base_permission.NotRole = []
		if (!this.#base_permission.NotUser) this.#base_permission.NotUser = []
		if (!this.#base_permission.HasRole) this.#base_permission.HasRole = []
		if (!this.#base_permission.IsUser) this.#base_permission.IsUser = []

		// Check toggle
		// TODO: Implement the togglestatus
		// if (!(interaction.member?.permissions as Readonly<PermissionsBitField>)?.has(PermissionsBitField.Flags.Administrator)) {
		//     return {
		//         success: false,
		//         content: 'This command was disabled by an administrator.',
		//         ephemeral: true
		//     }
		// }

		if (this.disabled) {
			return {
				success: false,
				content: `This command has been disabled. Please contact a Bot Developer if you believe this is an error.`
			}
		}

		if (this.scope !== scope) {
			return {
				success: false,
				content: `You are not allowed to run a ${scopeToString(this.scope)} command in the ${scopeToString(scope)} scope.`
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
		// Check base permissions
		switch (this.#base_permission.Level) {
			case PermissionLevel.MarketStaff:
				if (!interaction.member.roles.cache.has(RoleIDS.MarketStaff)) {
					return {
						success: false,
						content: "You must be Trial Market Moderator and up to use this command."
					}
				}
				break
			case PermissionLevel.TrialHelpModerator:
				if (!interaction.member.roles.cache.has(RoleIDS.TrialHelpModerator)) {
					return {
						success: false,
						content: "You must be Trial Help Moderator and up to use this command."
					}
				}

				break
			case PermissionLevel.HelpModerator:
				if (!interaction.member.roles.cache.has(RoleIDS.HelpModerator)) {
					return {
						success: false,
						content: "You must be Help Moderator and up to use this command."
					}
				}
				break
			case PermissionLevel.MarketModerator:
				if (!interaction.member.roles.cache.has(RoleIDS.MarketModerator)) {
					return {
						success: false,
						content: "You must be Market Moderator and up to use this command."
					}
				}
				break
			case PermissionLevel.HelpManager:
				if (!interaction.member.roles.cache.has(RoleIDS.HelpManager)) {
					return {
						success: false,
						content: "You must be Help Manager and up to use this command."
					}
				}
				break
			case PermissionLevel.AssistantModerator:
				if (!interaction.member.roles.cache.has(RoleIDS.AssistantModerator)) {
					return {
						success: false,
						content: "You must be Assistant Moderator and up to use this command."
					}
				}
				break
			case PermissionLevel.Moderator:
				if (!interaction.member.roles.cache.has(RoleIDS.Moderator)) {
					return {
						success: false,
						content: "You must be Moderator and up to use this command."
					}
				}
				break
			case PermissionLevel.SeniorModerator:
				if (!interaction.member.roles.cache.has(RoleIDS.SeniorModerator)) {
					return {
						success: false,
						content: "You must be Senior Moderator and up to use this command."
					}
				}
				break
				case PermissionLevel.SeniorMarketModerator:
				if (!interaction.member.roles.cache.has(RoleIDS.SeniorMarketModerator)) {
					return {
						success: false,
						content: "You must be Senior Market Moderator and up to use this command."
					}
				}
				break
			case PermissionLevel.AssistantAdministrator:
				if (!interaction.member.roles.cache.has(RoleIDS.AssistantAdministrator)) {
					return {
						success: false,
						content: "You must be Senior Moderator and up to use this command."
					}
				}
				break
			case PermissionLevel.Administrator:
				if (!interaction.member.roles.cache.has(RoleIDS.Administrator)) {
					return {
						success: false,
						content: "You must be Administrator and up to use this command."
					}
				}
				break
			case PermissionLevel.Developer:
				let response = false
				console.log(`⚙️ Dev check - User ID: ${interaction.user.id}, Allowed devs:`, config.devs)
				for (const dev of config.devs) {
					if (dev === interaction.user.id) {
						response = true
						break
					}
				}
				if (response == false) {
					return {
						success: false,
						content: "You must be an NEST developer to use this command."
					}
				}
				break
			case PermissionLevel.None:
				break
			default:
				return {
					success: false,
					content: "You aren't authorized to use this command."
				}
		}

		// if (!this.#base_permission(interaction)) {
		//     return {
		//         success: false,
		//         content: "You aren't authorized to use this command."
		//     }
		// }

		// Success
		return {
			success: true
		}
	}
	/** Runs the current {@link Executor}. */
	execute(interaction: ChatInputCommandInteraction): Promise<unknown> {
		return this.#executor(interaction) ?? Promise.resolve()
	}

	get scope(): Scope {
		return this.#base_permission.Scope ?? Scope.Default
	}

	get disabled(): boolean {
		return this.#disabled ?? false
	}
}
