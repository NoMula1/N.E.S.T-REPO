/* ──────────────────────────────────────────────────────────────────
   /managerembeds — central command for posting the NightHawk docs
   embeds. Staff-only. Each entry mirrors one section of the docs
   on https://nighthawknetwork.org so the in-Discord content stays
   the source-of-truth-style same as the website.

   Usage:
     /managerembeds                  → posts the Universal hub embed
                                       with buttons to view each doc
     /managerembeds section:portfolio → posts that single section
                                        directly into the channel

   Button interactions on the Universal hub are handled in
   src/events/help/DocsHubButtons.ts.

   To add a new doc: extend DOCS_EMBEDS below + add a matching
   choice on the `section` option. The buttons + autocomplete
   pick up new entries automatically.
   ────────────────────────────────────────────────────────────────── */
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	Colors,
	EmbedBuilder,
	PermissionsBitField,
} from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"

const NH_RED = 0xE63946
const NH_DARK = 0x100616
const SITE = "https://nighthawknetwork.org"

/* ─── Doc catalog ────────────────────────────────────────────────
   Each entry is a complete embed definition. The `key` is what
   the slash choice + button customId refer to.

   `intro`  → embed description (markdown, up to 4096 chars)
   `steps`  → ordered list rendered as one field
   `gotcha` → quick "watch out for" callout
   `url`    → button + footer link to the live page
*/
interface DocSection {
	key: string
	label: string
	emoji: string
	title: string
	intro: string
	steps: string[]
	gotcha: string
	url: string
}

const DOCS_EMBEDS: DocSection[] = [
	{
		key: "public-card",
		label: "Public Card",
		emoji: "🎴",
		title: "Public Card",
		intro:
			"Your **shareable portfolio link** at `nhwk.dev/c/yourname`. Built from your entries, badges, links, and visual customization. This is the single URL you share when someone asks to see your work.",
		steps: [
			"Set your display name + avatar in **Display Name** / **Change Avatar**",
			"Go to **Links** and claim your slug — locked after first claim",
			"Customize the look on the **Customize** page (background, audio, effects)",
			"Build the page layout in **Pages** (drag-and-drop sections)",
			"Hit **Public Card** in the sidebar to view your live card",
		],
		gotcha:
			"Slug must start with an alphanumeric character and is locked once claimed. Pick carefully.",
		url: `${SITE}/member/links`,
	},
	{
		key: "portfolio",
		label: "Portfolio",
		emoji: "📁",
		title: "Portfolio Entries",
		intro:
			"Your dev work, organized by category. Each entry has a title, description, image, and optional tags. Verified categories appear as tabs on your public card.",
		steps: [
			"Go to **Applications** and apply for the category that matches your work",
			"Wait for staff approval — you'll see APPROVED next to the category",
			"On the **Portfolio** page, click **+ New Entry** under that category",
			"Fill in title, image, optional description and tags, then save",
			"Reorder entries by drag — first one becomes the category thumbnail",
		],
		gotcha:
			"Discord image URLs **expire after ~24h** because of Discord's signed CDN tokens. Re-upload to NightHawk hosting or use Imgur for permanent links.",
		url: `${SITE}/member/portfolio`,
	},
	{
		key: "mockup-maker",
		label: "Mockup Maker",
		emoji: "🎨",
		title: "Mockup Maker",
		intro:
			"Generate **shareable preview images** from your portfolio entries. Pick a layout, drop in your work, customize the look, download as PNG. Drop it on Discord, in DMs, on for-hire posts — anywhere.",
		steps: [
			"Pick a template (Quad Grid, Triple Grid, Hero Collage, Staggered, Showcase Card, Magazine, Filmstrip)",
			"Click portfolio entries from the left panel to fill the slots",
			"On the **Style** tab, pick a theme preset or set custom accent + title",
			"On the **Watermark** tab, enable + style your watermark (16 effects, 4 tile modes)",
			"On the **Effects** tab, add chromatic / vignette / grain / accent border",
			"Click **Download PNG** when satisfied",
		],
		gotcha:
			"Watermark tile mode **Tiled** or **Banner** is your best defense against art theft. Set opacity ~40% so it reads on any background.",
		url: `${SITE}/member/portfolio-mockup`,
	},
	{
		key: "background-library",
		label: "Background Library",
		emoji: "🌌",
		title: "Background Library",
		intro:
			"Pick an **animated background** for your public card — gifs, videos, or images sourced from KLIPY, Pexels, Pixabay, and Steam Workshop (Wallpaper Engine). Live search returns millions of items.",
		steps: [
			"Open **Customize** in the sidebar",
			"Scroll to the **Library** section",
			"Type any keyword (anime, lo-fi, cyberpunk, galaxy, sunset…)",
			"Use the **Type** filter (Any / Videos / GIFs / Images) to narrow",
			"Click **Sources** to toggle which APIs you search across",
			"Click any tile to apply instantly, then save",
		],
		gotcha:
			"Wallpaper Engine animated wallpapers usually look best. Animated previews from Steam are scored highest in search results so they float to the top.",
		url: `${SITE}/member/customize`,
	},
	{
		key: "careers",
		label: "Careers",
		emoji: "🎯",
		title: "Careers & Applications",
		intro:
			"Apply for **development roles** to unlock portfolio categories, marketplace posting, and team assignments. Each application is reviewed by staff — usually within a few days.",
		steps: [
			"Browse open roles at **Applications** in the sidebar",
			"Click **Apply** on any role you want to pursue",
			"Fill in the application — quality work samples matter more than length",
			"Submit. Status moves: Pending → Approved or Denied",
			"Approved roles unlock the matching portfolio category",
		],
		gotcha:
			"Re-applying after a denial requires waiting 14 days. Use that time to improve your portfolio — denials usually mean we want to see more before deciding.",
		url: `${SITE}/member/applications`,
	},
	{
		key: "scam-logs",
		label: "Scam Logs",
		emoji: "🚨",
		title: "Scam Logs (DSF)",
		intro:
			"**Report and browse known scammers.** Submissions are reviewed by staff and published once verified. Helps the whole community avoid bad actors.",
		steps: [
			"Browse existing logs at **/scamlogs** — search by username, Discord ID, or platform",
			"To submit, click **Report** and fill in: subject identity, scam type, evidence, date",
			"Attach screenshots, transaction logs, message archives — the more concrete the better",
			"Staff reviews submissions within 1-3 days",
			"Approved reports appear publicly with your submission credited (anonymously by default)",
		],
		gotcha:
			"Reports need **concrete evidence**. Hearsay or vibes-only reports are denied. Screenshots with timestamps + Discord IDs are the gold standard.",
		url: `${SITE}/scamlogs`,
	},
	{
		key: "badges",
		label: "Badges",
		emoji: "🏆",
		title: "Badges",
		intro:
			"Cosmetic **recognitions** earned for contribution, role tenure, community participation, and event participation. Equipped badges appear on your public card.",
		steps: [
			"Open **Badges** in the sidebar to see your earned + available badges",
			"Click any badge for details on how it's earned",
			"Drag up to **6 badges** into your equipped row",
			"Reorder by drag — first slot is the showcase position",
			"Equipped badges render on your public card in the order shown",
		],
		gotcha:
			"Some badges are role-locked (only staff can wear them) and some are event-locked (only earnable during specific events). Don't farm — they're meant to be milestones.",
		url: `${SITE}/member/badges`,
	},
	{
		key: "customize",
		label: "Customize",
		emoji: "⚙️",
		title: "Customize Page",
		intro:
			"**Card-wide visual settings** — background, audio, opacity, effects, hero customization. This is where your card gets its personality.",
		steps: [
			"**Background** — image, gif, or video (or pick from the Library above)",
			"**Audio** — looping background track, muted by default",
			"**Opacity + Blur** — how transparent the card body is over the background",
			"**Colors** — background tint + accent color overrides",
			"**Effects** — Phosphor (CRT scanlines), Stars (animated starfield), Terminal Intro (boot animation)",
			"**Hero** — every element on the hero page is toggleable",
		],
		gotcha:
			"All effects default OFF for a reason — they're polarizing. Phosphor + Stars + Terminal Intro stacked can be overwhelming. Pick one as your signature look.",
		url: `${SITE}/member/customize`,
	},
]

/* Build an individual section embed */
function buildSectionEmbed(s: DocSection): EmbedBuilder {
	return new EmbedBuilder()
		.setTitle(`${s.emoji}  ${s.title}`)
		.setURL(s.url)
		.setColor(NH_RED)
		.setDescription(s.intro)
		.addFields(
			{
				name: "How to use it",
				value: s.steps.map((step, i) => `**${i + 1}.** ${step}`).join("\n"),
			},
			{
				name: "⚠️  Watch out for",
				value: s.gotcha,
			},
			{
				name: "Links",
				value: `[Open in the portal →](${s.url})\n[Full guide on docs →](${SITE}/docs/guide-${s.key})`,
			},
		)
		.setFooter({ text: "NightHawk Network · nighthawknetwork.org" })
}

/* Build the Universal hub embed + 2 button rows (max 5 per row) */
function buildUniversalEmbeds(): { embed: EmbedBuilder; rows: ActionRowBuilder<ButtonBuilder>[] } {
	const intro =
		"All NightHawk feature docs in one place. Pick any section below to view the full guide — only **you** see the answer, so feel free to explore without spamming the channel.\n\n" +
		DOCS_EMBEDS.map(s => `${s.emoji}  **${s.label}** — [${s.url.replace("https://", "")}](${s.url})`).join("\n") +
		`\n\nPrefer reading on the web? [Browse all guides at nighthawknetwork.org/docs →](${SITE}/docs)`

	const embed = new EmbedBuilder()
		.setTitle("📚  NightHawk Docs")
		.setURL(`${SITE}/docs`)
		.setColor(NH_RED)
		.setDescription(intro)
		.setFooter({ text: "Pick a section below · NightHawk Network" })

	// Discord caps at 5 buttons per row → split 8 docs across 2 rows
	const rows: ActionRowBuilder<ButtonBuilder>[] = []
	const half = Math.ceil(DOCS_EMBEDS.length / 2)
	for (let r = 0; r < 2; r++) {
		const slice = DOCS_EMBEDS.slice(r * half, (r + 1) * half)
		if (!slice.length) continue
		const row = new ActionRowBuilder<ButtonBuilder>()
		for (const s of slice) {
			row.addComponents(
				new ButtonBuilder()
					.setCustomId(`docs_view_${s.key}`)
					.setLabel(s.label)
					.setEmoji(s.emoji)
					.setStyle(ButtonStyle.Secondary),
			)
		}
		rows.push(row)
	}
	return { embed, rows }
}

/* Export the section list + helpers so the button handler in
   src/events/help/DocsHubButtons.ts can resolve a customId back
   to its section without duplicating data. */
export { DOCS_EMBEDS, buildSectionEmbed, buildUniversalEmbeds }
export type { DocSection }

export default new CommandExecutor()
	.setName("managerembeds")
	.setDescription("Post a NightHawk docs embed in this channel")
	.addStringOption(opt =>
		opt
			.setName("section")
			.setDescription("Which section to post — leave blank for the universal hub")
			.setRequired(false)
			.addChoices(
				{ name: "Universal Hub (all docs)", value: "universal" },
				...DOCS_EMBEDS.map(s => ({ name: `${s.emoji} ${s.label}`, value: s.key })),
			),
	)
	.setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
	.setBasePermission({
		Level: PermissionLevel.Moderator,
	})
	.setExecutor(async interaction => {
		if (!interaction.inCachedGuild()) {
			interaction.reply({
				content: "You must be inside a cached guild to use this command!",
				ephemeral: true,
			})
			return
		}

		const sectionKey = interaction.options.getString("section") ?? "universal"

		if (sectionKey === "universal") {
			const { embed, rows } = buildUniversalEmbeds()
			// `as any` follows the project's existing pattern for passing
			// ActionRowBuilder arrays — see PostButton.ts line 1285.
			await interaction.reply({ embeds: [embed], components: rows as any })
			return
		}

		const section = DOCS_EMBEDS.find(s => s.key === sectionKey)
		if (!section) {
			interaction.reply({
				content: `Unknown section: \`${sectionKey}\`. Use the dropdown.`,
				ephemeral: true,
			})
			return
		}

		await interaction.reply({ embeds: [buildSectionEmbed(section)] })
	})
