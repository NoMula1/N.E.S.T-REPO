import { AutocompleteInteraction, EmbedBuilder, roleMention } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { getGuildConfig } from "../../../utils/GuildConfigCache"

const userCD = new Map<string, NodeJS.Timeout>()

export default new CommandExecutor()
	.setName("pingrole")
	.setDescription("Ping help roles for help")
	.addStringOption(opt =>
		opt.setName("role")
			.setDescription("Select the type of help you need")
			.setRequired(true)
			.setAutocomplete(true)
	)
	.addStringOption(opt =>
		opt.setName("messagelink")
			.setDescription("Enter the link to the message you need help with")
			.setRequired(true)
	)
	.setBasePermission({ Level: PermissionLevel.None })
	.setAutocompleteExecutor(async (interaction: AutocompleteInteraction) => {
		if (!interaction.inCachedGuild()) { await interaction.respond([]); return }
		const guildCfg = await getGuildConfig(interaction.guildId!)
		const helpRoles = guildCfg?.helpRoles ?? []
		const focused = interaction.options.getFocused().toLowerCase()
		const choices = helpRoles
			.filter(hr => hr.name.toLowerCase().includes(focused))
			.slice(0, 25)
			.map(hr => ({ name: hr.name, value: hr.roleId }))
		await interaction.respond(choices)
	})
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) return
		const roleId = interaction.options.getString("role")
		const messageLink = interaction.options.getString("messagelink")
		const userId = interaction.user.id

		const guildCfg = await getGuildConfig(interaction.guildId!)
		const staffRoleIds = Object.values(guildCfg?.roles ?? {}).filter(Boolean) as string[]
		const isStaff = staffRoleIds.length > 0 && staffRoleIds.some(id => interaction.member.roles.cache.has(id))

		if (!isStaff && userCD.has(userId)) {
			interaction.reply({ content: 'You are on cooldown, please wait before asking for help again.', ephemeral: true })
			return
		}

		if (!roleId) {
			interaction.reply({ content: "Help role is invalid.", ephemeral: true })
			return
		}
		if (!messageLink) {
			interaction.reply({ content: "Invalid message link.", ephemeral: true })
			return
		}

		const isValidLink = /^https?:\/\/(www\.)?discord(app)?\.com\/channels\/(\d{17,19})\/(\d{17,19})\/(\d{17,19})$/.test(messageLink)
		if (!isValidLink) {
			interaction.reply({ content: "Invalid message link.", ephemeral: true })
			return
		}

		// Validate that the submitted role ID is still a configured help role (guards against injected IDs)
		const helpRoles = guildCfg?.helpRoles ?? []
		const validRole = helpRoles.find(hr => hr.roleId === roleId)
		if (!validRole) {
			interaction.reply({ content: "That help role is no longer configured for this server. Please try again.", ephemeral: true })
			return
		}

		const embed = new EmbedBuilder()
			.setTitle("Help Requested!")
			.setDescription(`**<@${interaction.user.id}>** has requested help from **<@&${roleId}>**.\n\n[Click here to view the referenced message](${messageLink})`)
			.setColor(0x2F3136)

		await interaction.reply({ embeds: [embed], content: roleMention(roleId), allowedMentions: { roles: [roleId] } })

		if (!isStaff) {
			userCD.set(userId, setTimeout(() => {
				userCD.delete(userId)
			}, 3600000))
		}
	})
