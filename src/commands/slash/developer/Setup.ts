import crypto from 'crypto'
import { ChatInputCommandInteraction, EmbedBuilder, PermissionsBitField } from 'discord.js'
import { CommandExecutor, PermissionLevel } from '../../../utils/CommandExecutor'
import { config } from '../../../utils/config'
import { getOrCreateGuildConfig, invalidateGuildConfig } from '../../../utils/GuildConfigCache'
import GuildConfigModel from '../../../schemas/GuildConfig'

export default new CommandExecutor()
	.setName('setup')
	.setDescription('Link this server to the NightHawk dashboard and generate a setup token.')
	// Permission level None — we do a combined dev + Discord Administrator check inside the executor.
	.setBasePermission({ Level: PermissionLevel.None })
	.setExecutor(async (interaction: ChatInputCommandInteraction) => {
		if (!interaction.inCachedGuild()) {
			await interaction.reply({ content: 'You must use this command inside a guild.', ephemeral: true })
			return
		}

		// Allow NEST developers OR users with Discord Administrator permission.
		const isDev = config.devs.includes(interaction.user.id)
		const isDiscordAdmin = interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator) ?? false

		if (!isDev && !isDiscordAdmin) {
			await interaction.reply({
				content: 'You must be a NEST developer or a server Administrator to use this command.',
				ephemeral: true,
			})
			return
		}

		const guildId = interaction.guildId!
		const guildName = interaction.guild.name

		// Ensure a config document exists
		await getOrCreateGuildConfig(guildId, guildName)

		// Generate a one-time 32-char hex token
		const linkToken = crypto.randomBytes(16).toString('hex')
		const linkTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h from now

		await GuildConfigModel.updateOne(
			{ guildId },
			{ $set: { linkToken, linkTokenExpires } }
		)

		// Bust cache so next read picks up the new token
		invalidateGuildConfig(guildId)

		// Fetch updated doc to show current linked status
		const updatedConfig = await GuildConfigModel.findOne({ guildId }).lean()
		const linked = updatedConfig?.linked ?? false

		const portalBase = process.env.PORTAL_URL?.replace(/\/$/, '') ?? 'https://devsecnetwork.org'
		const setupUrl = `${portalBase}/member/nest/setup?token=${linkToken}&guild=${guildId}`

		const embed = new EmbedBuilder()
			.setTitle('NEST Server Setup')
			.setColor('Blurple')
			.addFields(
				{ name: 'Guild', value: `${guildName} (\`${guildId}\`)`, inline: false },
				{ name: 'Linked', value: linked ? 'Yes' : 'No', inline: true },
				{ name: 'Setup Link', value: `[Click here to finish setup](${setupUrl})`, inline: false },
			)
			.setDescription(
				'Visit the link above to finish linking this server to the NightHawk dashboard. ' +
				'The link expires in **24 hours**.'
			)
			.setFooter({ text: 'Do not share this link — it grants access to link your server.' })
			.setTimestamp()

		await interaction.reply({ embeds: [embed], ephemeral: true })
	})
