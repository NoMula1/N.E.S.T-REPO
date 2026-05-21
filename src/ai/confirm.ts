/* ============================================================
   NightHawk AI — button-based confirmation flow
   Every destructive AI tool call passes through this helper.
   Posts a "Confirm action X" message with two buttons in the
   channel the user is in. Awaits the click (only from the
   original requester) with a 60s timeout.
============================================================ */
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
	Message,
	type ButtonInteraction,
} from "discord.js"

export interface ConfirmResult {
	approved: boolean
	reason: "approved" | "rejected" | "timeout" | "wrong-user"
}

/**
 * Posts a confirmation prompt and awaits a button click.
 * Times out after `timeoutMs` (default 60s).
 *
 * @param originalMessage  The triggering @-mention (used to know where to post + who to listen to)
 * @param action           Short action name like "Create channel #scam-alerts"
 * @param details          Rendered as bullet points under the action title
 */
export async function requestConfirmation(
	originalMessage: Message,
	action: string,
	details: string[],
	timeoutMs = 60_000,
): Promise<ConfirmResult> {
	const embed = new EmbedBuilder()
		.setColor(0xE67E22)
		.setTitle("🔒 Confirm action")
		.setDescription(`**${action}**\n\n${details.map(d => `• ${d}`).join("\n")}`)
		.setFooter({ text: `Awaiting confirmation from ${originalMessage.author.tag} · 60s timeout` })

	const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId("nhai-confirm")
			.setLabel("Confirm")
			.setStyle(ButtonStyle.Success)
			.setEmoji("✅"),
		new ButtonBuilder()
			.setCustomId("nhai-cancel")
			.setLabel("Cancel")
			.setStyle(ButtonStyle.Secondary)
			.setEmoji("❌"),
	)

	const prompt = await originalMessage.reply({
		embeds: [embed],
		components: [buttons as any],
		allowedMentions: { parse: [] },
	})

	try {
		const interaction: ButtonInteraction = await prompt.awaitMessageComponent({
			componentType: ComponentType.Button,
			filter: (i) => i.user.id === originalMessage.author.id,
			time: timeoutMs,
		})

		const approved = interaction.customId === "nhai-confirm"

		// Update the prompt to show the resolution
		const resultEmbed = EmbedBuilder.from(embed)
			.setColor(approved ? 0x27AE60 : 0x9B7AAF)
			.setTitle(approved ? "✅ Confirmed" : "❌ Canceled")
			.setFooter({ text: `Resolved by ${interaction.user.tag}` })

		await interaction.update({
			embeds: [resultEmbed],
			components: [],
		}).catch(() => { })

		return {
			approved,
			reason: approved ? "approved" : "rejected",
		}
	} catch (_e) {
		// Timeout
		const timeoutEmbed = EmbedBuilder.from(embed)
			.setColor(0x5A4070)
			.setTitle("⌛ Timed out")
			.setFooter({ text: "No response after 60s — action canceled." })

		await prompt.edit({
			embeds: [timeoutEmbed],
			components: [],
		}).catch(() => { })

		return { approved: false, reason: "timeout" }
	}
}
