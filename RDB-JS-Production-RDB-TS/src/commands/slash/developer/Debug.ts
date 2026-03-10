import { Scope } from "../../../bootstrap/GlobalScope"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { ChatInputCommandInteraction, AttachmentBuilder, EmbedBuilder, Channel, ChannelType } from "discord.js"
import { Log } from "../../../utils/logging"

import PostTemplates from "../../../schemas/PostTemplates"

export default new CommandExecutor()
	.setName("debug")
	.setDescription("Debug commands for NEST bot developers")
	.addStringOption(opt =>
		opt.setName("operation")
			.setDescription("Operation to execute")
			.addChoices(
				{ name: "🔃 Query Role Raw Position", value: "query_role_rawposition" },
				{ name: "📍 Query Pending Posts", value: "query_pending_posts" }
			)
			.setRequired(true)
	)
	.addUserOption(opt =>
		opt.setName("send_to")
			.setDescription("If available, send the output to a specific user")

	)
	.setBasePermission({
		Level: PermissionLevel.Developer,
		Scope: Scope.Default

	})
	.setExecutor(async (interaction: ChatInputCommandInteraction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }
		const sendto = interaction.options.getMember("send_to")
		switch (interaction.options.getString("operation")) {
			case "query_role_rawposition":
				const roles = interaction.guild.roles.cache.sort((r1, r2) => r2.position - r1.position)
					.map(role => `${role.name}: ${role.position}`)
					.join('\n')

				await interaction.reply({
					files: [
						new AttachmentBuilder(Buffer.from(roles), {
							name: 'rawposition.txt'
						})]
				}).catch((e: Error) => Log.error(e))
				return
			case "query_pending_posts":
				const cases = await PostTemplates.find({ waitingForApproval: true })
				const approvalChannel = interaction.guild.channels.cache.find((c: Channel) => {
					if (c.type === ChannelType.GuildText) {
						if (c.name === "template-approvals") {
							return c
						}
					}
				})
				if (!cases) {
					await interaction.reply({ content: "No pending posts found", ephemeral: true }).catch((e: Error) => {
						Log.error(e)
					})

				} else {
					try {
						const cases = await PostTemplates.find({ waitingForApproval: true }).lean()

						if (cases.length === 0) {
							await interaction.reply({ content: "No pending posts found", ephemeral: true })
						} else {
							await interaction.reply({ content: "Sending pending posts...", ephemeral: true })
							const chunkedPosts = chunk(cases, 40)

							for (const chunk of chunkedPosts) {
								const embed = new EmbedBuilder()
									.setTitle("[DEBUG] Posts Awaiting Verification")
									.setColor("Blurple")
									.setDescription(chunk.map(post => {
										if (post.approvalMessageID && approvalChannel?.id) {
											return `https://discord.com/channels/${interaction.guildId}/${approvalChannel.id}/${post.approvalMessageID}`
										}
										return 'N/A'
									}).join('\n'))
								if (sendto) {
									if (!sendto.createDM()) sendto.createDM()
									await sendto.send({ embeds: [embed] })
									return
								} else {
									if (!interaction.user.createDM()) interaction.user.createDM()
									await interaction.user.send({ embeds: [embed] })
								};
								await interaction.editReply({ content: "Sent pending posts!" })
							}
						}
					} catch (e) {
						await interaction.reply({ content: "An error occurred while fetching pending posts", ephemeral: true })
						Log.error(`[DEBUG] An error occurred while fetching pending posts: ${e}`)
						return
					}
				}
				return
				break
			default:
				interaction.reply({ content: "Invalid Subcommand", ephemeral: true })
				return
		}
	})


function chunk<T>(array: T[], chunkSize: number): T[][] {
	const chunks = []
	for (let i = 0; i < array.length; i += chunkSize) {
		chunks.push(array.slice(i, i + chunkSize))
	}
	return chunks
}
