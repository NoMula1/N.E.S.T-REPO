import { Events, TextChannel, Interaction, EmbedBuilder, Colors, ChannelType, ButtonStyle, ActionRowBuilder, ButtonBuilder, MessageFlags } from 'discord.js'
import { EventOptions } from '../../utils/RegisterEvents'
import { Log } from '../../utils/logging';

export const reportPing = "<@&1079439643814141993>"

export default {
	name: Events.InteractionCreate,
	once: false,
	async execute(_: EventOptions, i: Interaction) {
		if (!i.isModalSubmit()) return;
		if (!i.customId.startsWith("report-message-submit")) return;
		if (!i.channel) return;
		await i.deferReply({
			flags: MessageFlags.Ephemeral
		})
		
		const reportsChannel = i.guild!.channels.cache.find((c)=>c.type === ChannelType.GuildText && c.name === "reports")

		if (!reportsChannel) {
			Log.error("Missing reports for reported messages!");
			(i.channel as TextChannel).send("<@&1177007392668536873> Missing reports channel!\n- Must be named reports\n- Must be a staff channel")
			return
		}

		const messageId = i.customId.split("-")[3]
		const message = await i.channel.messages.fetch(messageId)

		message.react('⚠')
		i.editReply({content: `User <@${message.author.id}> has succesfully been reported, and mods have been notified. Thanks for helping keep NIGHTHAWK SERVERS safe.`})

		await (reportsChannel as TextChannel).send(({
			content: reportPing,
			embeds: [
				new EmbedBuilder()
					.setTitle("Message Report")
					.setDescription(`Reporter: <@${i.user.id}>\nReason:\n\`\`\`\n${i.fields.getTextInputValue('reason')}\n\`\`\`\nJump: ${message.url}\nMessage:\n\`\`\`\n${message.content.replace('`', '\`')}\n\`\`\``)
					.setColor(Colors.Red)
			],
			components: [
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId(`message-report-reviewed`)
						.setLabel("Mark as Resolved")
						.setStyle(ButtonStyle.Success))
			]
		}))
	}
}
