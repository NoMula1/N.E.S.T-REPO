/* ──────────────────────────────────────────────────────────────────
   /managerembeds — central command for posting NightHawk docs +
   feature guides as Discord embeds. Staff-only.

   STRUCTURE (per Tyler's spec)

     Universal hub  → 5 top-level buttons:
                      Marketplace · Portfolios · Scam Logs ·
                      Careers · Documentation
     Portfolios     → overview embed + sub-buttons for each
                      sub-feature (Entries / Applications /
                      Mockup Maker / Background Library /
                      Customize / Badges)
     Documentation  → category buttons (Legal / Hiring /
                      Marketplace / R.I.O.T / Community / FAQ) →
                      per-category doc select-menu → individual
                      doc embed
     Direct send    → /managerembeds section:<autocomplete> posts
                      ANY single embed (feature, sub-feature, or
                      doc) straight into the channel

   Feature + sub-feature content is authored in-file (full
   walkthroughs). Doc content is pulled live from the website's
   /docs/manifest.json so the ~28 legal/policy/RIOT/FAQ docs stay
   one-source-of-truth on the web — each renders as title + summary
   + link to the full page.

   Interaction handling lives in src/events/help/DocsHubButtons.ts.
   ────────────────────────────────────────────────────────────────── */
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	PermissionsBitField,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { FLAG_COMPONENTS_V2, v2Banner, v2Container, v2Section, v2Separator, v2Text } from "../../../utils/ComponentsV2"

const NH_RED = 0xE63946
const SITE = "https://nighthawknetwork.org"

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */
interface EmbedDef {
	key: string
	label: string
	emoji: string
	title: string
	intro: string
	steps?: string[]
	gotcha?: string
	url: string
	/** For parent features (portfolios) — keys of PORTFOLIO_SUBS to expose as drill-down buttons. */
	subKeys?: string[]
}

interface DocMeta {
	slug: string
	title: string
	tldr: string
	category: string
	catLabel: string
	accent?: number
}

/* ═══════════════════════════════════════════════════════════════
   PORTFOLIO SUB-FEATURES
   Reached by drilling into the Portfolios button. Each is also
   directly sendable via the section autocomplete (sub:<key>).
═══════════════════════════════════════════════════════════════ */
const PORTFOLIO_SUBS: EmbedDef[] = [
	{
		key: "portfolio-entries",
		label: "Entries",
		emoji: "📇",
		title: "Portfolio · Entries",
		intro:
			"Your dev work, organized by category. Each entry is a title, image, optional description, and tags. Entries auto-render on your public card at `nighthawknetwork.org/c/<yourname>` — no publish step, edits land instantly.",
		steps: [
			"Get verified in at least one category via **Applications** (the sub-feature next door)",
			"On the **Portfolio** page, click **+ New Entry** under an approved category",
			"Fill in title, image, optional description and tags, then save",
			"Reorder entries by drag — the first one becomes the category thumbnail",
			"View your live card any time via **Public Card** in the sidebar",
		],
		gotcha:
			"Discord image URLs **expire after ~24h** (signed CDN tokens). Re-upload through NightHawk hosting or use Imgur for stable links — otherwise the entry's image goes dead.",
		url: `${SITE}/member/portfolio`,
	},
	{
		key: "applications",
		label: "Applications",
		emoji: "✅",
		title: "Portfolio · Applications (Category Verification)",
		intro:
			"Apply to be **verified in a portfolio category** so you can post entries in it. Approval also earns the **Verified badge** on your card. It's a skill-check — not a hiring system. (For jobs at NightHawk, see **Careers**.)",
		steps: [
			"Open **Applications** in the sidebar",
			"Find the category that matches your work (Scripter, Modeler, GFX, etc.) and click **Apply**",
			"Link to real work samples — Roblox places, galleries, GitHub. Quality over quantity",
			"Submit. Status flows: Pending → Approved / Denied",
			"Approved categories unlock the matching Portfolio tab + the Verified badge",
		],
		gotcha:
			"Re-applying after a denial requires a 14-day wait. Use it to ship more work — denials usually mean 'show us more,' not 'never.'",
		url: `${SITE}/member/applications`,
	},
	{
		key: "mockup-maker",
		label: "Mockup Maker",
		emoji: "🎨",
		title: "Portfolio · Mockup Maker",
		intro:
			"Generate **shareable preview images** from your portfolio entries — pick a layout, drop in your work, customize, download a 1920×1080 PNG. Use it on for-hire posts, in DMs, anywhere you need to summarize your portfolio in one image.",
		steps: [
			"Pick a template — **7 ship**: Quad Grid, Triple Grid, Staggered, Hero Collage, Showcase Card, Magazine, Filmstrip",
			"Click portfolio entries from the left panel to fill the slots",
			"**Style** tab — theme preset or custom accent + title",
			"**Watermark** tab — enable + style (12 fonts, 16 text effects, 3 tile modes: Single / Grid / Scatter)",
			"**Effects** tab — chromatic / vignette / grain / accent border",
			"Click **Download PNG**",
		],
		gotcha:
			"Use **Grid** or **Scatter** tile mode to deter art theft — single-stamp watermarks are easily cropped off. Opacity ~40% reads on any background.",
		url: `${SITE}/member/portfolio-mockup`,
	},
	{
		key: "background-library",
		label: "Background Library",
		emoji: "🌌",
		title: "Portfolio · Background Library",
		intro:
			"Pick an **animated background** for your public card. Search across millions of items — gifs from KLIPY, videos from Pexels, stock images from Pixabay, and live wallpapers from Steam Workshop (Wallpaper Engine).",
		steps: [
			"Open **Customize** in the sidebar, scroll to the **Library** section",
			"Type any keyword (anime, lo-fi, cyberpunk, galaxy, sunset…)",
			"Use the **Type** filter (Any / Videos / GIFs / Images) to narrow",
			"Click **Sources** to toggle which APIs you search across",
			"Click any tile to apply instantly, then save",
		],
		gotcha:
			"Wallpaper Engine animated wallpapers usually look best — they're designed for the use case. Search scores video results highest so they float to the top.",
		url: `${SITE}/member/customize`,
	},
	{
		key: "customize",
		label: "Customize",
		emoji: "⚙️",
		title: "Portfolio · Customize",
		intro:
			"**Card-wide visual settings** — background, audio, opacity, blur, colors, and visual effects. Where your card gets its personality. Every setting has a sensible default; the heavier looks are opt-in.",
		steps: [
			"**Background** — image, gif, or video. Upload up to 20MB or pick from the Library",
			"**Audio** — looping track, muted by default. Visitors can unmute",
			"**Opacity + Blur** — how transparent / frosted the card body is over the background",
			"**Colors** — background tint + accent overrides (blank = defaults)",
			"**Effects** — Phosphor (CRT scanlines), Stars (starfield), Terminal Intro (boot animation)",
			"**Hero** — toggle individual elements on your card's first page",
		],
		gotcha:
			"All three effects stacked (Phosphor + Stars + Terminal Intro) gets overwhelming. Pick **one** as your signature. Terminal Intro adds 2-3s before the card paints.",
		url: `${SITE}/member/customize`,
	},
	{
		key: "badges",
		label: "Badges",
		emoji: "🏆",
		title: "Portfolio · Badges",
		intro:
			"Cosmetic **recognitions** earned for contribution, role tenure, marketplace activity, community work, and events. Equipped badges show in a row on your public card hero.",
		steps: [
			"Open **Badges** in the sidebar",
			"Filter by category — Staff, Marketplace, Community, Awards, Events, Misc",
			"Click any badge for details on how it's earned",
			"Drag up to **6 badges** into the Equipped row",
			"Reorder by drag — first slot is the showcase position",
		],
		gotcha:
			"Role-locked badges only show while you hold the role. Event badges can never be re-issued — earn them while they're available.",
		url: `${SITE}/member/badges`,
	},
]

/* ═══════════════════════════════════════════════════════════════
   TOP-LEVEL FEATURES
   The 5 buttons on the universal hub. `portfolios` + `documentation`
   are parents (drill-down); the rest are leaf embeds.
═══════════════════════════════════════════════════════════════ */
const TOP_LEVEL: EmbedDef[] = [
	{
		key: "marketplace",
		label: "Marketplace",
		emoji: "🛒",
		title: "Marketplace",
		intro:
			"NightHawk's marketplace connects developers and clients across **Discord and the web**. Post a **Hiring**, **For Hire**, or **Selling** listing — it syncs both ways: post on Discord with `/post`, it shows on the website; post on the website, it shows in Discord.",
		steps: [
			"On Discord, run **`/post`** and pick a type — **Hiring** (you need work done), **For Hire** (offering services), or **Selling** (assets / products)",
			"Or post from the **website marketplace** — same three types",
			"Fill the template: clear title, specific description, pricing, portfolio proof, delivery estimate, contact method",
			"Submit — staff reviews before it goes live",
			"Once approved, your listing appears in **both** the Discord marketplace channels and on the website",
		],
		gotcha:
			"Listings need real pricing + portfolio proof. No stolen content, account sales, or ToS-violating services — see **Marketplace Rules** under Documentation. Market-banned users can't post.",
		url: `${SITE}/marketplace`,
	},
	{
		key: "portfolios",
		label: "Portfolios",
		emoji: "📁",
		title: "Portfolios",
		intro:
			"Your verified work showcase. Get verified in categories, post entries, and they render as your public card at `nighthawknetwork.org/c/<yourname>`.\n\nThe portfolio system has several sub-features — pick one below to dive in:\n\n📇 **Entries** — add your work\n✅ **Applications** — get verified in a category\n🎨 **Mockup Maker** — generate shareable preview images\n🌌 **Background Library** — animated card backgrounds\n⚙️ **Customize** — card-wide visuals\n🏆 **Badges** — earned cosmetics",
		url: `${SITE}/member/portfolio`,
		subKeys: ["portfolio-entries", "applications", "mockup-maker", "background-library", "customize", "badges"],
	},
	{
		key: "scam-logs",
		label: "Scam Logs",
		emoji: "🚨",
		title: "Scam Prevention Database",
		intro:
			"NightHawk's public registry of **verified scammers** — Discord users, Roblox accounts, or platform identities caught running scams against developers. Contributed by partner Roblox dev servers and reviewed by NightHawk staff. R.I.O.T's `/scamlookup` command queries this list.",
		steps: [
			"Browse records at **/scamlogs** — search by username, Discord ID, or platform handle",
			"If contacted by someone listed, treat the interaction with caution",
			"To submit a record, contribute via your partner server or open a ticket in the NightHawk hub",
			"Submissions need concrete evidence — screenshots with IDs, transaction logs, message archives",
			"To dispute a record about you, join the NightHawk hub and open an appeal",
		],
		gotcha:
			"Reports need **concrete evidence** — screenshots with timestamps + Discord IDs are the gold standard. Hearsay gets denied, not because we doubt you, but because publishing an unverified accusation could hurt the wrong person.",
		url: `${SITE}/scamlogs`,
	},
	{
		key: "careers",
		label: "Careers",
		emoji: "💼",
		title: "Careers (Work at NightHawk)",
		intro:
			"**NightHawk's open positions** — volunteer, hybrid, and paid roles across development, design, investigation, moderation, and community. We hire people we'd want to work with for the long haul.\n\nNot the same as portfolio **Applications** (verification to post entries), and not the same as **hiring NightHawk** to build your project.",
		steps: [
			"Browse open positions at **/careers**",
			"Each listing shows the role, type (volunteer / hybrid / paid), and what we're looking for",
			"Click **Apply** and answer the role-specific questions",
			"Submit. Staff reviews; you'll hear back via the contact channel you provided",
			"Approved hires get onboarded with mentorship from senior staff",
		],
		gotcha:
			"Don't confuse Careers with Applications. Careers = joining the NightHawk team. Applications = getting verified to post portfolio entries. Hiring NightHawk for your project is a third, separate flow (see Documentation → Hiring NightHawk).",
		url: `${SITE}/careers`,
	},
	{
		key: "documentation",
		label: "Documentation",
		emoji: "📚",
		title: "Documentation",
		intro:
			"Everything published at **nighthawknetwork.org/docs** — terms, policies, R.I.O.T docs, processes, and FAQs. Pick a category below to browse, then choose a document to view it as its own embed.",
		url: `${SITE}/docs`,
	},
]

/* ═══════════════════════════════════════════════════════════════
   DOC MANIFEST — fetched live + cached for 10 min
═══════════════════════════════════════════════════════════════ */
let docCache: { at: number; docs: DocMeta[] } | null = null
const DOC_CACHE_MS = 10 * 60 * 1000

async function loadDocs(): Promise<DocMeta[]> {
	if (docCache && Date.now() - docCache.at < DOC_CACHE_MS) return docCache.docs
	try {
		const r = await fetch(`${SITE}/docs/manifest.json`)
		if (r.ok) {
			const m: any = await r.json()
			const cats: Record<string, any> = Object.fromEntries((m.categories || []).map((c: any) => [c.id, c]))
			const docs: DocMeta[] = (m.docs || [])
				.filter((d: any) => d.category !== "guides" && d.category !== "__internal__")
				.map((d: any) => ({
					slug: d.slug,
					title: d.title,
					tldr: d.tldr || "",
					category: d.category,
					catLabel: cats[d.category]?.label || d.category,
					accent: cats[d.category]?.accent ? parseInt(String(cats[d.category].accent).replace("#", ""), 16) : undefined,
				}))
			docCache = { at: Date.now(), docs }
			return docs
		}
	} catch (e) {
		console.warn("[managerembeds] manifest fetch failed:", (e as Error).message)
	}
	return docCache?.docs || []
}

/* Ordered list of doc categories for the Documentation hub. */
const DOC_CATEGORY_ORDER = [
	{ id: "legal",       label: "Legal & Compliance", emoji: "⚖️" },
	{ id: "hiring",      label: "Hiring & Freelance", emoji: "🤝" },
	{ id: "marketplace", label: "Marketplace",        emoji: "🛒" },
	{ id: "riot",        label: "R.I.O.T Bot",        emoji: "🤖" },
	{ id: "community",   label: "Community",          emoji: "👥" },
	{ id: "faq",         label: "FAQ",                emoji: "❓" },
]

/* ═══════════════════════════════════════════════════════════════
   EMBED BUILDERS
═══════════════════════════════════════════════════════════════ */

/* Leaf feature / sub-feature embed (marketplace, scam-logs, careers, all portfolio subs) */
function buildLeafEmbed(d: EmbedDef): EmbedBuilder {
	const e = new EmbedBuilder()
		.setTitle(`${d.emoji}  ${d.title}`)
		.setURL(d.url)
		.setColor(NH_RED)
		.setDescription(d.intro)
		.setFooter({ text: "NightHawk Network · nighthawknetwork.org" })
	if (d.steps?.length) {
		e.addFields({ name: "How to use it", value: d.steps.map((s, i) => `**${i + 1}.** ${s}`).join("\n") })
	}
	if (d.gotcha) {
		e.addFields({ name: "⚠️  Watch out for", value: d.gotcha })
	}
	e.addFields({ name: "Link", value: `[Open in the portal →](${d.url})` })
	return e
}

/* Portfolios parent — overview embed + sub-feature buttons */
function buildPortfolioHub(): { embed: EmbedBuilder; rows: ActionRowBuilder<ButtonBuilder>[] } {
	const def = TOP_LEVEL.find(t => t.key === "portfolios")!
	const embed = new EmbedBuilder()
		.setTitle(`${def.emoji}  ${def.title}`)
		.setURL(def.url)
		.setColor(NH_RED)
		.setDescription(def.intro)
		.setFooter({ text: "Pick a sub-feature below · NightHawk Network" })
	const rows: ActionRowBuilder<ButtonBuilder>[] = []
	const subs = PORTFOLIO_SUBS
	for (let i = 0; i < subs.length; i += 5) {
		const row = new ActionRowBuilder<ButtonBuilder>()
		for (const s of subs.slice(i, i + 5)) {
			row.addComponents(
				new ButtonBuilder()
					.setCustomId(`me_sub_${s.key}`)
					.setLabel(s.label)
					.setEmoji(s.emoji)
					.setStyle(ButtonStyle.Secondary),
			)
		}
		rows.push(row)
	}
	return { embed, rows }
}

/* Documentation parent — overview + category buttons */
async function buildDocsHub(): Promise<{ embed: EmbedBuilder; rows: ActionRowBuilder<ButtonBuilder>[] }> {
	const docs = await loadDocs()
	const counts: Record<string, number> = {}
	for (const d of docs) counts[d.category] = (counts[d.category] || 0) + 1
	const def = TOP_LEVEL.find(t => t.key === "documentation")!
	const list = DOC_CATEGORY_ORDER
		.filter(c => counts[c.id])
		.map(c => `${c.emoji}  **${c.label}** — ${counts[c.id]} doc${counts[c.id] === 1 ? "" : "s"}`)
		.join("\n")
	const embed = new EmbedBuilder()
		.setTitle(`${def.emoji}  ${def.title}`)
		.setURL(def.url)
		.setColor(NH_RED)
		.setDescription(`${def.intro}\n\n${list}`)
		.setFooter({ text: "Pick a category below · NightHawk Network" })
	const rows: ActionRowBuilder<ButtonBuilder>[] = []
	const cats = DOC_CATEGORY_ORDER.filter(c => counts[c.id])
	for (let i = 0; i < cats.length; i += 5) {
		const row = new ActionRowBuilder<ButtonBuilder>()
		for (const c of cats.slice(i, i + 5)) {
			row.addComponents(
				new ButtonBuilder()
					.setCustomId(`me_doccat_${c.id}`)
					.setLabel(c.label)
					.setEmoji(c.emoji)
					.setStyle(ButtonStyle.Secondary),
			)
		}
		rows.push(row)
	}
	return { embed, rows }
}

/* Per-category doc select menu */
async function buildDocCategorySelect(catId: string): Promise<{ embed: EmbedBuilder; rows: ActionRowBuilder<StringSelectMenuBuilder>[] } | null> {
	const docs = (await loadDocs()).filter(d => d.category === catId)
	if (!docs.length) return null
	const cat = DOC_CATEGORY_ORDER.find(c => c.id === catId)
	const embed = new EmbedBuilder()
		.setTitle(`${cat?.emoji || "📚"}  ${cat?.label || catId}`)
		.setColor(NH_RED)
		.setDescription(`${docs.length} document${docs.length === 1 ? "" : "s"} in this category. Pick one from the menu to view it.`)
		.setFooter({ text: "NightHawk Network · nighthawknetwork.org" })
	const menu = new StringSelectMenuBuilder()
		.setCustomId("me_docpick")
		.setPlaceholder("Choose a document…")
		.addOptions(
			docs.slice(0, 25).map(d =>
				new StringSelectMenuOptionBuilder()
					.setLabel(d.title.slice(0, 100))
					.setDescription((d.tldr || "").slice(0, 100))
					.setValue(d.slug),
			),
		)
	const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)
	return { embed, rows: [row] }
}

/* Individual doc embed — summary + link (full text lives on the web) */
function buildDocEmbed(doc: DocMeta): EmbedBuilder {
	return new EmbedBuilder()
		.setTitle(`📄  ${doc.title}`)
		.setURL(`${SITE}/docs/${doc.slug}`)
		.setColor(doc.accent ?? NH_RED)
		.setDescription(doc.tldr || "_No summary available._")
		.addFields({ name: "Read the full document", value: `[${SITE.replace("https://", "")}/docs/${doc.slug} →](${SITE}/docs/${doc.slug})` })
		.setFooter({ text: `${doc.catLabel} · NightHawk Docs` })
}

/* Universal hub — 5 top-level category buttons */
function buildUniversalHub(): { embed: EmbedBuilder; rows: ActionRowBuilder<ButtonBuilder>[] } {
	const intro =
		"Everything NightHawk, in one place. Pick a section below — only **you** see what opens, so explore freely without spamming the channel.\n\n" +
		TOP_LEVEL.map(t => `${t.emoji}  **${t.label}**`).join("   ·   ") +
		`\n\nPrefer the web? [Browse all docs at nighthawknetwork.org/docs →](${SITE}/docs)`
	const embed = new EmbedBuilder()
		.setTitle("📖  NightHawk — Docs & Features")
		.setURL(`${SITE}/docs`)
		.setColor(NH_RED)
		.setDescription(intro)
		.setFooter({ text: "Pick a section below · NightHawk Network" })
	const row = new ActionRowBuilder<ButtonBuilder>()
	for (const t of TOP_LEVEL) {
		row.addComponents(
			new ButtonBuilder()
				.setCustomId(`me_top_${t.key}`)
				.setLabel(t.label)
				.setEmoji(t.emoji)
				.setStyle(ButtonStyle.Primary),
		)
	}
	return { embed, rows: [row] }
}

/* ═══════════════════════════════════════════════════════════════
   TEST EMBED — Components V2 demo
   A faithful reproduction of the MakeYourDiscord server-info message
   Tyler shared, built with Discord's Components V2 layout (banners,
   text+thumbnail sections, dividers, headings). Demonstrates the
   format end-to-end.

   Notes:
     • Sent with MessageFlags.IsComponentsV2 — NO content/embeds allowed
       alongside it.
     • Banners + thumbnails are NightHawk's own hosted artwork at
       nighthawknetwork.org/img/embeds (permanent URLs, no expiring
       tokens). Rendered via the site's SVG→PNG pipeline.
     • Copy is original NightHawk onboarding content (English).
       Standard Unicode emoji so everything renders without the bot
       needing to share a server with any custom emoji source.
═══════════════════════════════════════════════════════════════ */
function buildTestComponents() {
	const IMG = `${SITE}/img/embeds`
	// Thin wrappers over the shared ComponentsV2 helpers that prefix the
	// hosted-image path. rule/td map straight to v2Separator/v2Text.
	const banner = (file: string, alt: string) => v2Banner(`${IMG}/${file}`, alt)
	const rule = v2Separator
	const td = v2Text
	const section = (blocks: string[], thumbFile: string) => v2Section(blocks, `${IMG}/${thumbFile}`)

	// NightHawk onboarding embed in the Components V2 style — original copy +
	// original hosted banners/tiles (not the reference's content or art).
	const items = [
		banner("hero.png", "NightHawk — Developer Protection Network"),
		rule(),
		section([
			"## 🛡️ What is NightHawk?\n💬 **NightHawk** is a **developer protection network** for the Roblox creator community. We run a cross-server scam registry, verified portfolios, a marketplace, and a careers system — all built to keep developers safe and help good work get seen. Everything here is **free**. 🎉",
		], "tile-reticle.png"),
		rule(),
		banner("services.png", "Our Services"),
		rule(),
		section([
			"### 🎨 __**Verified Portfolios**__\nBuild a public card at `nhwk.dev/c/you` that shows off your work.",
			"🔹 Apply to get **verified** in a category — Scripter, Builder, GFX, and more.\n\n🔹 Post entries, equip badges, and customize your card with backgrounds + effects.\n\n🔹 Generate shareable preview images with the **Mockup Maker**. Open **/managerembeds** anytime for the full guide.",
		], "tile-wrench.png"),
		rule(),
		section([
			"### 🛒 __**The Marketplace**__\nHire developers, offer your services, or sell assets — synced between Discord and the web.",
			"🔸 Post with **/post** — Hiring, For Hire, or Selling.\n\n🔸 Every listing is **staff-reviewed** before it goes live.\n\n🔸 No scams, no stolen content, no ToS-breaking services — that's the whole point.",
		], "tile-chart.png"),
		rule(),
		td("💜 There's a lot more under the hood. Here's the rest of what NightHawk runs:"),
		td("## 🚨 Scam Logs\nA public registry of **verified scammers**, queryable in-server with R.I.O.T's `/scamlookup`. Contributed by partner servers, reviewed by staff.\n\n## 🎯 Careers\nOpen positions at NightHawk — **volunteer, hybrid, and paid** roles across development, design, investigation, and community.\n\n## 📚 Documentation\nEvery policy, R.I.O.T doc, and feature guide lives at **nighthawknetwork.org/docs**.\n\n## 🤝 Partners\nRun a Roblox dev server? Join the **R.I.O.T network** and protect your community from known scammers."),
		rule(),
		section([
			"💬 Active members earn roles + badges that show on your public card.\n\n🟢 Verified in a category = **Verified** badge\n🟢 Contribute to the scam registry = **Investigator** track\n🟢 Tenure + participation = **milestone** badges",
		], "tile-reticle.png"),
	]

	// Wrap everything in a Container so it renders as one cohesive bordered
	// card (the "actual embed" look) instead of loose components on the
	// channel background. v2Container wraps the ordered list into one card
	// (no accent stripe — plain dark card to match the reference).
	return [v2Container(items)]
}

/* Exports for the interaction handler in DocsHubButtons.ts */
export {
	TOP_LEVEL,
	PORTFOLIO_SUBS,
	loadDocs,
	buildLeafEmbed,
	buildPortfolioHub,
	buildDocsHub,
	buildDocCategorySelect,
	buildDocEmbed,
	buildUniversalHub,
	buildTestComponents,
}
export type { EmbedDef, DocMeta }

/* ═══════════════════════════════════════════════════════════════
   COMMAND
═══════════════════════════════════════════════════════════════ */
export default new CommandExecutor()
	.setName("managerembeds")
	.setDescription("Post a NightHawk docs / feature embed in this channel")
	.addStringOption(opt =>
		opt
			.setName("section")
			.setDescription("Jump straight to a feature, sub-feature, or doc — leave blank for the universal hub")
			.setRequired(false)
			.setAutocomplete(true),
	)
	.setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
	.setBasePermission({ Level: PermissionLevel.Moderator })
	.setAutocompleteExecutor(async (interaction) => {
		const focused = interaction.options.getFocused().toLowerCase()
		const docs = await loadDocs()
		const all = [
			{ name: "📖 Universal Hub (everything)", value: "hub" },
			{ name: "🧪 TestEmbed (Components V2 demo)", value: "test" },
			...TOP_LEVEL.map(t => ({ name: `${t.emoji} ${t.label}`, value: `feat:${t.key}` })),
			...PORTFOLIO_SUBS.map(s => ({ name: `${s.emoji} Portfolio · ${s.label}`, value: `sub:${s.key}` })),
			...docs.map(d => ({ name: `📄 ${d.catLabel} · ${d.title}`.slice(0, 100), value: `doc:${d.slug}` })),
		]
		const filtered = all.filter(c => c.name.toLowerCase().includes(focused)).slice(0, 25)
		await interaction.respond(filtered)
	})
	.setExecutor(async interaction => {
		if (!interaction.inCachedGuild()) {
			interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true })
			return
		}
		const raw = interaction.options.getString("section")

		// No arg, or explicit "hub" → universal hub (public, with nav buttons)
		if (!raw || raw === "hub") {
			const { embed, rows } = buildUniversalHub()
			await interaction.reply({ embeds: [embed], components: rows as any })
			return
		}

		// TestEmbed → Components V2 message. IsComponentsV2 flag is required
		// and forbids content/embeds, so this reply shape is distinct.
		if (raw === "test") {
			await interaction.reply({
				flags: FLAG_COMPONENTS_V2 as any,
				components: buildTestComponents() as any,
			})
			return
		}

		// feat:<key>
		if (raw.startsWith("feat:")) {
			const key = raw.slice(5)
			if (key === "portfolios") {
				const { embed, rows } = buildPortfolioHub()
				await interaction.reply({ embeds: [embed], components: rows as any })
				return
			}
			if (key === "documentation") {
				const { embed, rows } = await buildDocsHub()
				await interaction.reply({ embeds: [embed], components: rows as any })
				return
			}
			const def = TOP_LEVEL.find(t => t.key === key)
			if (def) { await interaction.reply({ embeds: [buildLeafEmbed(def)] }); return }
		}

		// sub:<key>
		if (raw.startsWith("sub:")) {
			const def = PORTFOLIO_SUBS.find(s => s.key === raw.slice(4))
			if (def) { await interaction.reply({ embeds: [buildLeafEmbed(def)] }); return }
		}

		// doc:<slug>
		if (raw.startsWith("doc:")) {
			const slug = raw.slice(4)
			const doc = (await loadDocs()).find(d => d.slug === slug)
			if (doc) { await interaction.reply({ embeds: [buildDocEmbed(doc)] }); return }
		}

		interaction.reply({ content: `Couldn't resolve \`${raw}\`. Use the autocomplete to pick a valid section.`, ephemeral: true })
	})
