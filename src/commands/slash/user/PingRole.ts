import { EmbedBuilder, roleMention } from "discord.js"
import { CommandExecutor, PermissionLevel, RoleIDS } from "../../../utils/CommandExecutor"


const userCD = new Map<string, NodeJS.Timeout>()

export default new CommandExecutor()
	.setName("pingrole")
	.setDescription("Ping help roles for help")
	.addStringOption(opt =>
		opt.setName("role")
			.setDescription("Role to ping")
			.setRequired(true)
			.addChoices(
				{ name: 'Scripting', value: '1480457270285566086' },
				{ name: 'Advanced Scripting', value: '1480457221975445605' },
				{ name: 'Modeling', value: '1480459000662462495' },
				{ name: 'Building', value: '1480459532013535345' },
				{ name: 'Animation', value: '1480456771045687508' },
				{ name: 'General', value: '1480456771045687508' },
			)
	)
	.addStringOption(opt =>
		opt.setName("messagelink")
			.setDescription("Enter the link to the message you need help with")
			.setRequired(true)
	)
	.setBasePermission(
		{ Level: PermissionLevel.None }
	)
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) return
		const role = interaction.options.getString("role")
		const messageLink = interaction.options.getString("messagelink")
		const userId = interaction.user.id

		const staffRoles = Object.values(RoleIDS)
		const isStaff = staffRoles.some(id => interaction.member.roles.cache.has(id))

		if (!isStaff && userCD.has(userId)) {
			interaction.reply({ content: 'You are on cooldown, please wait before asking for help', ephemeral: true })
			return
		}

		if (!role) {
			interaction.reply({ content: "Help role is invalid", ephemeral: true })
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

		const roleid: string = role
		const embed = new EmbedBuilder()
			.setTitle("Help Requested!")
			.setDescription(`**<@${interaction.user.id}>** has requested help from **<@&${roleid}>**.\n\n[Click here to view the referenced message](${messageLink})`)
			.setColor(0x2F3136)

		await interaction.reply({ embeds: [embed], content: roleMention(roleid), allowedMentions: { roles: [roleid] } })
		if (!isStaff) {
			userCD.set(userId, setTimeout(() => {
				userCD.delete(userId)
			}, 3600000))
		}
	})
