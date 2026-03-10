import { EmbedBuilder, PermissionFlagsBits } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { errorEmbed, sendModLogs } from "../../../utils/GenUtils"
import { config } from "../../../utils/config"

const authorized_list = [
	'1149913737558499358', // t9knightnight
	'140163987500302336', // cj 
	'348174855755137027' // Shooter
	// where is lanjt, a-holes!!
]

export default new CommandExecutor()
	.setName("role")
	.setDescription("Add a role to a user")
	.addUserOption(opt =>
		opt.setName("user")
			.setDescription("User to add the specified role to")
			.setRequired(true)
	)
	.addRoleOption(opt =>
		opt.setName("role")
			.setDescription("Role to add to the specified user")
			.setRequired(true)
	)
	.setDefaultMemberPermissions(BigInt(0x0004000000000000)) // USE_EXTERNAL_APPS: https://discord.com/developers/docs/topics/permissions#permissions-bitwise-permission-flags
	.setBasePermission({
		HasRole: ['1203544113501437952', '1274077734171316315'], // Senior Marketplace Moderator, Senior Ranker (Role for giving out ranking roles)
		Level: PermissionLevel.Moderator

	})
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }
		const role = interaction.options.getRole("role")
		const user = interaction.options.getUser("user")
		const member = interaction.guild.members.cache.get(user?.id as any)

		const trustedHelper = interaction.guild.roles.cache.find(role => role.name.toLowerCase() === "trusted helper")

		if (!role || !user || !interaction.guild) { interaction.reply({ content: "You must use this on a valid role/user!", ephemeral: true }); return }
		if (role.rawPosition >= (trustedHelper?.rawPosition ?? 192) && !authorized_list.includes(interaction.member.id)) { // check if theyre authed first
			interaction.reply(errorEmbed("You cant give / remove this role")) // make sure they cant give out a role they arent supposed to
			return
		}

		if (role) {

			if (member && (interaction.guild.members.me?.roles.highest.position! <= role.position)) {
				interaction.reply(errorEmbed("I am unable to assign this role as it is higher than my highest role."))
				return
			}
			if (interaction.member.roles.highest.position <= role.position) {
				interaction.reply(errorEmbed("You are unable to assign this role as it is higher or equal to your highest role."))
				return
			}
		}
		if (role.permissions.has(PermissionFlagsBits.Administrator)) {
			if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
				await interaction.reply(errorEmbed("This role has administrator permissions and cant be given"))
				return
			}
		}

		const add = new EmbedBuilder()
			.setColor("Purple")
			.setDescription(`${config.successEmoji}<@&${role.id}> added to user <@${user.id}> successfully!`)
		const remove = new EmbedBuilder()
			.setColor("Purple")
			.setDescription(`<@&${role.id}> removed from user <@${user.id}> successfully!`)

		if (!interaction.guild.members.cache.get(user.id)?.roles.cache.has(role.id)) { // give roles if they dont have it
			await interaction.guild.members.cache.get(user.id)?.roles.add(role.id)
			await interaction.reply({ embeds: [add] })
			await sendModLogs({ guild: interaction.guild!, mod: interaction.member!, targetUser: user, action: "Ban" }, { title: "Role Added", actionInfo: `**Role Name**: ${role.name}` })
			return
		}
		await member?.roles.remove(role.id) // remove roles if they have it
		await interaction.reply({ embeds: [remove] })
		await sendModLogs({ guild: interaction.guild!, mod: interaction.member!, targetUser: user, action: "Ban" }, { title: "Role Removed", actionInfo: `**Role Name**: ${role.name}` })
		return
	})
