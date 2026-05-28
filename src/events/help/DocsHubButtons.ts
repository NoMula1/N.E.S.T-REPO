/* ──────────────────────────────────────────────────────────────────
   Button handler for the /managerembeds Universal hub embed.
   When a user clicks any of the "view section" buttons, we reply
   ephemerally with the section's detail embed so only the clicker
   sees it — no channel spam.

   customId convention:  docs_view_<section-key>
   ────────────────────────────────────────────────────────────────── */
import { Events, Interaction } from "discord.js"
import { EventOptions } from "../../utils/RegisterEvents"
import {
	DOCS_EMBEDS,
	buildSectionEmbed,
} from "../../commands/slash/staff/ManagerEmbeds"

const CUSTOM_ID_PREFIX = "docs_view_"

export default {
	name: Events.InteractionCreate,
	once: false,
	async execute(_: EventOptions, interaction: Interaction) {
		if (!interaction.isButton()) return
		if (!interaction.customId.startsWith(CUSTOM_ID_PREFIX)) return

		const sectionKey = interaction.customId.slice(CUSTOM_ID_PREFIX.length)
		const section = DOCS_EMBEDS.find(s => s.key === sectionKey)
		if (!section) {
			await interaction.reply({
				content: `Unknown docs section: \`${sectionKey}\`.`,
				ephemeral: true,
			})
			return
		}

		await interaction.reply({
			embeds: [buildSectionEmbed(section)],
			ephemeral: true,
		})
	},
}
