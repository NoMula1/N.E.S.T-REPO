import { Collection, GuildMember, GuildMemberRoleManager, Role, RoleResolvable, Snowflake } from "discord.js"

// @ts-expect-error Extending private class for mocking
export default class MockGuildMemberRoleManager extends GuildMemberRoleManager {
	#cache = new Collection<Snowflake, Role>()

	constructor(member: GuildMember) {
		super(member)
	}

	get cache() {
		return this.#cache
	}

	async add(roleOrRoles: RoleResolvable | RoleResolvable[] | Collection<Snowflake, Role>, reason: string): Promise<GuildMember> {
		if (roleOrRoles instanceof Collection || Array.isArray(roleOrRoles)) {
			for (const role of roleOrRoles.values()) {
				this.addRole(role)
			}
		} else {
			this.addRole(roleOrRoles)
		}

		return super.add(roleOrRoles, reason)
	}

	private addRole(role: RoleResolvable) {
		if (role instanceof Role) {
			this.#cache.set(role.id, role)
		} else {
			const id = role as Snowflake
			// @ts-expect-error Need to create a role.
			const newRole = this.guild.roles._add({
				id: role,
				name: role
			})
			this.#cache.set(id, newRole)
		}
	}

	async remove(roleOrRoles: RoleResolvable | readonly RoleResolvable[] | Collection<string, Role>, reason?: string | undefined): Promise<GuildMember> {
		if (roleOrRoles instanceof Collection || Array.isArray(roleOrRoles)) {
			for (const role of roleOrRoles.values()) {
				this.removeRole(role)
			}
		} else {
			this.removeRole(roleOrRoles as RoleResolvable)
		}

		return super.remove(roleOrRoles, reason)
	}

	private removeRole(role: RoleResolvable) {
		if (role instanceof Role) {
			this.#cache.delete(role.id)
		} else {
			this.#cache.delete(role)
		}
	}
}
