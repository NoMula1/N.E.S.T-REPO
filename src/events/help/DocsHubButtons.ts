/* ──────────────────────────────────────────────────────────────────
   Interaction handler for /managerembeds navigation. All replies are
   ephemeral so exploring the hub never spams the channel — the only
   public posts come from /managerembeds itself.

   customId scheme:
     me_top_<key>        top-level button (marketplace / portfolios /
                         scam-logs / careers / documentation)
     me_sub_<key>        portfolio sub-feature button
     me_doccat_<catId>   documentation category button → doc select
     me_docpick          string-select of docs → individual doc embed
   ────────────────────────────────────────────────────────────────── */
import { Events, Interaction } from "discord.js"
import { EventOptions } from "../../utils/RegisterEvents"
import {
	TOP_LEVEL,
	PORTFOLIO_SUBS,
	loadDocs,
	buildLeafEmbed,
	buildPortfolioHub,
	buildDocsHub,
	buildDocCategorySelect,
	buildDocEmbed,
} from "../../commands/slash/staff/ManagerEmbeds"

export default {
	name: Events.InteractionCreate,
	once: false,
	async execute(_: EventOptions, interaction: Interaction) {
		// ─── Buttons ───
		if (interaction.isButton()) {
			const id = interaction.customId

			// Top-level category buttons
			if (id.startsWith("me_top_")) {
				const key = id.slice("me_top_".length)
				if (key === "portfolios") {
					const { embed, rows } = buildPortfolioHub()
					await interaction.reply({ embeds: [embed], components: rows as any, ephemeral: true })
					return
				}
				if (key === "documentation") {
					const { embed, rows } = await buildDocsHub()
					await interaction.reply({ embeds: [embed], components: rows as any, ephemeral: true })
					return
				}
				const def = TOP_LEVEL.find(t => t.key === key)
				if (def) { await interaction.reply({ embeds: [buildLeafEmbed(def)], ephemeral: true }); return }
				await interaction.reply({ content: `Unknown section: \`${key}\`.`, ephemeral: true })
				return
			}

			// Portfolio sub-feature buttons
			if (id.startsWith("me_sub_")) {
				const def = PORTFOLIO_SUBS.find(s => s.key === id.slice("me_sub_".length))
				if (def) { await interaction.reply({ embeds: [buildLeafEmbed(def)], ephemeral: true }); return }
				await interaction.reply({ content: "Unknown sub-feature.", ephemeral: true })
				return
			}

			// Documentation category buttons → doc select menu
			if (id.startsWith("me_doccat_")) {
				const catId = id.slice("me_doccat_".length)
				const built = await buildDocCategorySelect(catId)
				if (built) { await interaction.reply({ embeds: [built.embed], components: built.rows as any, ephemeral: true }); return }
				await interaction.reply({ content: "No docs in that category.", ephemeral: true })
				return
			}
			return
		}

		// ─── Doc select menu ───
		if (interaction.isStringSelectMenu() && interaction.customId === "me_docpick") {
			const slug = interaction.values[0]
			const doc = (await loadDocs()).find(d => d.slug === slug)
			if (doc) {
				await interaction.reply({ embeds: [buildDocEmbed(doc)], ephemeral: true })
				return
			}
			await interaction.reply({ content: `Couldn't load doc: \`${slug}\`.`, ephemeral: true })
			return
		}
	},
}
