import { ApplicationCommandType, ContextMenuCommandBuilder, ContextMenuCommandInteraction, InteractionReplyOptions, MessageContextMenuCommandInteraction, PermissionsBitField, Role, UserContextMenuCommandInteraction, ContextMenuCommandType } from "discord.js"
import { Permission, PermissionLevel } from "./CommandExecutor"
import { config } from "../utils/config"
import { Scope, scope, toString as scopeToString } from "../bootstrap/GlobalScope"

/** The main action of a command. */
export type ContextInteraction = MessageContextMenuCommandInteraction|UserContextMenuCommandInteraction


/** The results of checking user permissions. */
interface PermissionsResult extends InteractionReplyOptions {
	success: boolean;
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

		// Check toggle
		// TODO: Implement the togglestatus
		// if (!(interaction.member?.permissions as Readonly<PermissionsBitField>)?.has(PermissionsBitField.Flags.Administrator)) {
		//     return {
		//         success: false,
		//         content: 'This command was disabled by an administrator.',
		//         ephemeral: true
		//     }
		// }

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
			case PermissionLevel.AssistantModerator:
				if (interaction.member.roles.highest.position < interaction.member.guild.roles.cache.find((r: Role) => r.name.toLowerCase() === "assistant moderator")?.position!) {
					return {
						success: false,
						content: "You must be Assistant Moderator and up to use this command."
					}
				}
				break
			case PermissionLevel.Moderator:
				if (interaction.member.roles.cache.find((r: Role) => r.name.toLowerCase() === "moderator")?.position! > interaction.member.roles.highest.position) {
					return {
						success: false,
						content: "You must be Moderator and up to use this command."
					}
				}
				break
			case PermissionLevel.AssistantAdministrator:
				if (interaction.member.roles.cache.find((r: Role) => r.name.toLowerCase() === "assistant administrator")?.position! > interaction.member.roles.highest.position) {
					return {
						success: false,
						content: "You must be Moderator and up to use this command."
					}
				}
				break
			case PermissionLevel.Administrator:
				if (interaction.member.roles.cache.find((r: Role) => r.name.toLowerCase() === "administrator")?.position! > interaction.member.roles.highest.position) {
					return {
						success: false,
						content: "You must be Administrator and up to use this command."
					}
				}
				break
			case PermissionLevel.Developer:
				let response = false
				for (const dev of config.devs) {
					if (dev === interaction.user.id) {
						response = true
						break
					}
				}
				if (response == false) {
					return {
						success: false,
						content: "You must be a NEST developer to use this command."
					}
				}
				break
			default:
				return {
					success: true
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
	execute(interaction: T): Promise<unknown> {
		return this.#executor(interaction) ?? Promise.resolve()
	}

	get scope(): Scope {
		return this.#base_permission.Scope ?? Scope.Default
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
