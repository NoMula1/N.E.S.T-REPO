import { ApplicationCommandType, ContextMenuCommandBuilder, ContextMenuCommandInteraction, InteractionReplyOptions, MessageContextMenuCommandInteraction, PermissionsBitField, UserContextMenuCommandInteraction, ContextMenuCommandType } from "discord.js"
import { Permission, PermissionLevel } from "./CommandExecutor"
import { config } from "../utils/config"
import { getGuildConfig } from '../utils/GuildConfigCache'
import { GuildRoles } from '../schemas/GuildConfig'

/** The main action of a command. */
export type ContextInteraction = MessageContextMenuCommandInteraction|UserContextMenuCommandInteraction


/** The results of checking user permissions. */
interface PermissionsResult extends InteractionReplyOptions {
	success: boolean;
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

export class ContextCommandExecutor<T> extends ContextMenuCommandBuilder {
	#executor: (interaction: T) => Promise<void> | void
	#base_permission: Permission

	constructor() {
		super()

		this.#executor = function () {
			throw new Error('Command executor unimplemented (call setExecutor before exporting commands)')
		}
		this.#base_permission = { Level: PermissionLevel.None }
	}

	/**
	 * Sets the {@link executor}.
	 * @param executor The actual executor.
	 * @returns {NESTCommand}
	*/
	setExecutor(executor: (interaction: T) => Promise<void> | void): ContextCommandExecutor<T> {
		this.#executor = executor
		return this
	}

	/** Sets the base permissions that will always apply to the command. */
	setBasePermission(permission: Permission): ContextCommandExecutor<T> {
		this.#base_permission = permission
		return this
	}

	/**
	 * Checks if the user has permission to run this command.
	 * @param {Interaction} interaction
	 * @returns The result of checking if the user has permission to run the command.
	 */
	async hasPermission(interaction: ContextMenuCommandInteraction): Promise<PermissionsResult> {
		if (!interaction.inCachedGuild()) return { success: false, content: "You must use this in a guild." }
		if (!(interaction.member?.permissions as Readonly<PermissionsBitField>)?.has([
			PermissionsBitField.Flags.SendMessages,
			PermissionsBitField.Flags.EmbedLinks])) {
			return {
				success: false
			}
		}
		if (!this.#base_permission.NotRole) this.#base_permission.NotRole = []
		if (!this.#base_permission.NotUser) this.#base_permission.NotUser = []
		if (!this.#base_permission.HasRole) this.#base_permission.HasRole = []
		if (!this.#base_permission.IsUser) this.#base_permission.IsUser = []

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

		// Developers bypass all role-level checks
		if (config.devs.includes(interaction.user.id)) return { success: true }

		if (level === PermissionLevel.Developer) {
			return { success: false, content: 'You must be a NEST developer to use this command.' }
		}

		// Discord Administrators bypass NEST role checks
		if (interaction.memberPermissions?.has('Administrator')) return { success: true }

		const mapping = LEVEL_ROLE_MAP[level]
		if (!mapping) return { success: false, content: "You aren't authorized to use this command." }

		const guildConfig = await getGuildConfig(interaction.guildId!)
		const roleId = guildConfig?.roles?.[mapping.key]
		if (!roleId) return { success: false, content: `This server hasn't configured the ${mapping.key} role yet. Run /setup or configure roles in the NEST dashboard.` }
		if (!interaction.member.roles.cache.has(roleId)) return { success: false, content: mapping.message }
		return { success: true }
	}

	/** Runs the current {@link Executor}. */
	execute(interaction: T): Promise<unknown> {
		return this.#executor(interaction) ?? Promise.resolve()
	}
}

export class MessageContextCommandExecutor extends ContextCommandExecutor<MessageContextMenuCommandInteraction> {
	constructor() {
		super()
		this.setType(ApplicationCommandType.Message as ContextMenuCommandType)
	}
}

export class UserContextCommandExecutor extends ContextCommandExecutor<UserContextMenuCommandInteraction> {
	constructor() {
		super()
		this.setType(ApplicationCommandType.User as ContextMenuCommandType)
	}
}
