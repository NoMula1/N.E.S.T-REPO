import { EmbedBuilder, Message, TextChannel, roleMention } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"


const userCD = new Map<string, NodeJS.Timeout>()

export default new CommandExecutor()
	.setName("pingrole")
	.setDescription("Ping help roles for help")
	.addStringOption(opt =>
		opt.setName("role")
			.setDescription("Role to ping")
			.setRequired(true)
			.addChoices(
				{ name: 'Scripting', value: '860403017291399218' },
				{ name: 'Advanced Scripting', value: '860406415259467809' },
				{ name: 'Modeling', value: '860403126162948106' },
				{ name: 'Building', value: '860402692919525376' },
				{ name: 'Animation', value: '947686667886673960' },
				{ name: 'General', value: '860407504192929802' },
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
		if (!interaction.inCachedGuild) return
		const role = interaction.options.getString("role")
		const messageLink = interaction.options.getString("messagelink")
		const userId = interaction.user.id

		if (userCD.has(userId)) {
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
		const ValidatedMessage = await validateMessageLink(messageLink, (interaction.channel! as TextChannel))
		if (typeof ValidatedMessage == 'string') {
			interaction.reply({ content: ValidatedMessage, ephemeral: true })
			return
		}
		const roleid: string | undefined = role

		console.log('role ID:', roleid)

		if (!roleid) {
			interaction.reply({ content: 'help role not found', ephemeral: true })
			return
		}
		const embed = new EmbedBuilder()
			.setTitle("Help Requested!")
			.setDescription(`**<@${interaction.user.id}>** has requested help from **<@&${roleid}>**.\n\n[Click here to visit the referenced message in this channel](${messageLink})`)
			.setColor(0x2F3136)

		await interaction.reply({ embeds: [embed], content: roleMention(roleid), allowedMentions: { roles: [roleid] } })
		userCD.set(userId, setTimeout(() => {
			userCD.delete(userId)
		}, 3600000))
	})


async function validateMessageLink(link: string, channel: TextChannel): Promise<Message | string> {
	const regResults = /^https?:\/\/(www\.)?discord(app)?\.com\/channels\/(\d{17,19})\/(\d{17,19})\/(\d{17,19})$/.test(link)
	if (regResults == false) {
		return "Invalid link."
	}

	const id = link.split('/')[link.split('/').length - 1]

	try {
		const found = await channel.messages.fetch(id)
		if (!found) {
			return "Unable to fetch message!"
		}
		return found
	} catch (error) {
		return "An error occurred while fetching the message."
	}
};



