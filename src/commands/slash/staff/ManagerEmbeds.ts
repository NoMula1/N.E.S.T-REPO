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
		key: "portfolio",
		label: "Portfolio",
		emoji: "📁",
		title: "Portfolio",
		intro:
			"Your **dev work, organized by category**. Each entry is a title, image, optional description, and tags. Your entries auto-render on your public card at `nighthawknetwork.org/c/<yourname>` — no publish step, edits land instantly.\n\nTo post entries in a category (UI/UX, Scripter, Modeler, GFX/Art, etc.) you first need to be **approved for that category** via the Applications page — see the Applications guide.",
		steps: [
			"Get approved for at least one category via **Applications** (gives you the Verified badge)",
			"On the **Portfolio** page, click **+ New Entry** under an approved category",
			"Fill in title, image, optional description and tags, then save",
			"Reorder entries by drag — first one becomes the category thumbnail",
			"View your live card any time by clicking **Public Card** in the sidebar",
		],
		gotcha:
			"Discord image URLs **expire after ~24h** because Discord signs them with a time-limited token. Re-upload through NightHawk hosting or use Imgur for stable links — otherwise your entry's image goes dead.",
		url: `${SITE}/member/portfolio`,
	},
	{
		key: "applications",
		label: "Applications",
		emoji: "✅",
		title: "Applications (Category Verification)",
		intro:
			"Apply to be **verified in a portfolio category** so you can post entries in it. Approval also earns you the **Verified badge** that appears on your public card.\n\nThis is *not* a hiring system — it's a skill-check that vouches you as a Scripter, Modeler, GFX Artist, etc. on the platform.",
		steps: [
			"Open **Applications** in the sidebar",
			"Find the category that matches your work, click **Apply**",
			"Fill out the form — link to real work samples (Roblox places, image galleries, GitHub)",
			"Submit. Status flows: Pending → Approved / Denied",
			"Approved categories unlock the matching tab on your Portfolio page + the Verified badge",
		],
		gotcha:
			"Work samples matter more than written length. Three strong samples beat ten mediocre ones. If you were on a team for a project, say what your role was — undisclosed shared credit gets flagged.",
		url: `${SITE}/member/applications`,
	},
	{
		key: "mockup-maker",
		label: "Mockup Maker",
		emoji: "🎨",
		title: "Mockup Maker",
		intro:
			"Generate **shareable preview images** from your portfolio entries. Pick a layout, drop in your work, customize the look, download as a 1920×1080 PNG. Use it on for-hire posts, in DMs, anywhere you need to summarize your portfolio in one image.",
		steps: [
			"Pick a template — 7 ship: Quad Grid, Triple Grid, Staggered, Hero Collage, Showcase Card, Magazine, Filmstrip",
			"Click portfolio entries from the left panel to fill the slots",
			"On the **Style** tab, pick a theme preset or set custom accent + title",
			"On the **Watermark** tab, enable + style your watermark (12 fonts, 16 text effects, 4 tile modes)",
			"On the **Effects** tab, add chromatic / vignette / grain / accent border",
			"Click **Download PNG** when satisfied",
		],
		gotcha:
			"Use a **Tiled** or **Banner** watermark to deter art theft. Single-corner marks are easily cropped off. Opacity ~40% reads on any background.",
		url: `${SITE}/member/portfolio-mockup`,
	},
	{
		key: "background-library",
		label: "Background Library",
		emoji: "🌌",
		title: "Background Library",
		intro:
			"Pick an **animated background** for your public card. Search across millions of items — gifs from KLIPY, videos from Pexels, stock images from Pixabay, and live wallpapers from Steam Workshop (Wallpaper Engine).",
		steps: [
			"Open **Customize** in the sidebar",
			"Scroll to the **Library** section",
			"Type any keyword (anime, lo-fi, cyberpunk, galaxy, sunset…)",
			"Use the **Type** filter (Any / Videos / GIFs / Images) to narrow",
			"Click **Sources** to toggle which APIs you search across",
			"Click any tile to apply instantly, then save",
		],
		gotcha:
			"Wallpaper Engine animated wallpapers usually look best as backgrounds — they're designed for the use case. The search scores video-type results highest so they float to the top.",
		url: `${SITE}/member/customize`,
	},
	{
		key: "customize",
		label: "Customize",
		emoji: "⚙️",
		title: "Customize",
		intro:
			"**Card-wide visual settings** — background, audio, opacity, blur, colors, and visual effects. This is where your card gets its personality. Every setting has a sensible default; the heavier looks (CRT scanlines, animated starfield) are opt-in.",
		steps: [
			"**Background** — image, gif, or video. Upload up to 20MB or pick from the Library",
			"**Audio** — looping track, muted by default. Visitors can unmute via a volume widget",
			"**Profile Opacity + Blur** — how transparent and frosted the card body is over the background",
			"**Colors** — background tint + accent color overrides (leave blank for defaults)",
			"**Effects** — Phosphor (CRT scanlines), Stars (animated starfield), Terminal Intro (boot animation)",
			"**Hero** — toggle individual elements on your card's first page (badges row, commission status, rate pill, etc.)",
		],
		gotcha:
			"All three effects stacked (Phosphor + Stars + Terminal Intro) gets overwhelming. Pick **one** as your signature look. Terminal Intro adds 2-3 seconds before your card paints, so skip it if you want visitors to land instantly.",
		url: `${SITE}/member/customize`,
	},
	{
		key: "badges",
		label: "Badges",
		emoji: "🏆",
		title: "Badges",
		intro:
			"Cosmetic **recognitions** earned for contribution, role tenure, marketplace activity, community work, and events. Equipped badges show in a row on your public card hero.",
		steps: [
			"Open **Badges** in the sidebar to see earned + available badges",
			"Filter by category — Staff, Marketplace, Community, Awards, Events, Misc",
			"Click any badge for details on how it's earned",
			"Drag up to **6 badges** into the Equipped row at the top",
			"Reorder by drag — first slot is the showcase position",
		],
		gotcha:
			"Role-locked badges (Owner, Admin, Investigator) only show while you hold the role — leave the role and the badge disappears. Event badges can never be re-issued, so earn them while they're available.",
		url: `${SITE}/member/badges`,
	},
	{
		key: "scam-logs",
		label: "Scam Logs",
		emoji: "🚨",
		title: "Scam Prevention Database",
		intro:
			"NightHawk's public registry of **verified scammers** — Discord users, Roblox accounts, or platform identities that have been caught running scams against developers. Contributed by partner Roblox dev servers and reviewed by NightHawk staff. R.I.O.T's `/scamlookup` command queries this list.",
		steps: [
			"Browse existing records at **/scamlogs** — search by username, Discord ID, or platform handle",
			"If contacted by someone listed, treat the interaction with caution",
			"To submit a new record, contribute via your partner server or open a ticket in the NightHawk hub",
			"Submissions need concrete evidence — screenshots with IDs, transaction logs, message archives",
			"To dispute a record about you, join the NightHawk hub and open an appeal",
		],
		gotcha:
			"Reports need **concrete evidence**. Hearsay or vibes-only reports get denied. Screenshots with timestamps + Discord IDs are the gold standard — without them, the report can't be approved (not because we doubt you, but because publishing an unverified accusation could hurt the wrong person).",
		url: `${SITE}/scamlogs`,
	},
	{
		key: "careers",
		label: "Careers",
		emoji: "💼",
		title: "Careers (Work at NightHawk)",
		intro:
			"**NightHawk's open positions** — volunteer, hybrid, and paid roles across development, design, investigation, moderation, and community. We hire people we'd want to work with for the long haul.\n\nNot to be confused with portfolio Applications. Careers is about *joining the NightHawk team*; Applications is about *getting verified to post portfolio entries*.",
		steps: [
			"Browse open positions at **/careers**",
			"Each listing shows the role, type (volunteer / hybrid / paid), and what we're looking for",
			"Click **Apply** on any role that fits — answer the role-specific questions",
			"Submit. Staff reviews; you'll hear back via the contact channel you provided",
			"Approved hires get onboarded with mentorship from senior staff",
		],
		gotcha:
			"Hiring NightHawk for *your* project is different — that goes through the [hiring service agreement](https://nighthawknetwork.org/docs/hiring-nighthawk), not the Careers page. Careers is for people who want to join the NightHawk team.",
		url: `${SITE}/careers`,
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
				name: "Link",
				value: `[Open in the portal →](${s.url})`,
			},
		)
		.setFooter({ text: "NightHawk Network · nighthawknetwork.org" })
}

/* Build the Universal hub embed + 2 button rows (max 5 per row) */
function buildUniversalEmbeds(): { embed: EmbedBuilder; rows: ActionRowBuilder<ButtonBuilder>[] } {
	const intro =
		"All NightHawk feature docs in one place. Pick any section below to view the full guide — only **you** see the answer, so feel free to explore without spamming the channel.\n\n" +
		DOCS_EMBEDS.map(s => `${s.emoji}  **${s.label}** — [${s.url.replace("https://", "")}](${s.url})`).join("\n")

	const embed = new EmbedBuilder()
		.setTitle("📚  NightHawk Docs")
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
