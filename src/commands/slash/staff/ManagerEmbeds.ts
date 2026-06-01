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
	ContainerBuilder,
	EmbedBuilder,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	PermissionsBitField,
	SectionBuilder,
	SeparatorBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextDisplayBuilder,
	ThumbnailBuilder,
} from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"

const NH_RED = 0xE63946
const SITE = "https://nighthawknetwork.org"
/* MessageFlags.IsComponentsV2 (1 << 15). Used as a raw value because the
   top-level discord-api-types bundled with discord.js predates this flag
   in its typings, even though the runtime + builders support it. */
const FLAG_COMPONENTS_V2 = 1 << 15

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
     • Banner / thumbnail images use placehold.co placeholders so the
       demo is self-contained (the original Discord CDN URLs had
       expiring tokens, several already dead). Swap these for hosted
       NightHawk images for a real one.
     • Custom emoji from the source server → Unicode equivalents so
       they render anywhere. Role/channel names → bold text instead of
       broken mentions.
═══════════════════════════════════════════════════════════════ */
function buildTestComponents() {
	const BLURPLE = 0x5865F2
	const ph = (w: number, h: number, bg: string, label: string) =>
		`https://placehold.co/${w}x${h}/${bg}/FFFFFF/png?text=${encodeURIComponent(label)}`
	const banner = (label: string, alt: string) =>
		new MediaGalleryBuilder().addItems(
			new MediaGalleryItemBuilder().setURL(ph(600, 149, "5865F2", label)).setDescription(alt))
	const rule = () => new SeparatorBuilder().setDivider(true)
	const td = (s: string) => new TextDisplayBuilder().setContent(s)
	const section = (blocks: string[], thumbLabel: string) =>
		new SectionBuilder()
			.addTextDisplayComponents(blocks.map(td))
			.setThumbnailAccessory(new ThumbnailBuilder().setURL(ph(170, 170, "5865F2", thumbLabel)))

	// Ordered to match the live MakeBetter render Tyler compared against.
	const items = [
		banner("MakeYourDiscord", "bon c'est ma première image, on y va molo"),
		rule(),
		section([
			"## 🐀 C'est quoi ce serveur ?\n💬 **MakeYourDiscord** est un serveur **d'entraide** français, il est destiné aux utilisateurs aguerris mais surtout aussi aux __débutants de Discord__. On veut les aider, informer ! Donc ici, vous retrouverez des **services**, des évènements, des projets (coucou MakeBetter) pour vous aider sur Discord ! Tout les services du serveur sont **gratuits**… 🎉",
		], "INFO"),
		rule(),
		banner("NOS SERVICES", "ps : on en a 2 types"),
		rule(),
		section([
			"### 🛠️ __**La conception**__\nOn créer, modifie vos serveurs en fonction de vos demandes !",
			"🔹 L'unique condition est d'avoir invité __2 personnes__ sur le serveur avec votre propre lien d'invitation.\n\n🔹 Vous devrez remplir un __formulaire__ pour qu'on soit les plus efficaces possibles ! Attention, vous pouvez avoir accès au même service seulement 1 fois toutes les 2 semaines.\n\n🔹 Ce sont nos superbes **@Concepteurs** qui s'en chargent ! __Respectez-les__ :)",
		], "DESIGN"),
		rule(),
		section([
			"### 📊 L'**évaluation**\nBasée sur une cinquantaine de critères (subjectifs), ramenés sur 20, elle vous aide à viser les points forts et faibles de vos serveurs !",
			"Pareillement,\n\n🔸 L'unique condition est d'avoir invité __2 personnes__ sur le serveur avec votre propre lien d'invitation.\n\n🔸 Vous devrez remplir un __formulaire__ pour qu'on soit les plus efficaces possibles ! Seulement 1 fois toutes les 2 semaines.\n\n🔸 Ce sont nos superbes **@Evaluateurs** qui s'en chargent ! __Respectez-les__ :)",
		], "EVAL"),
		rule(),
		td("💜 En effet, y'a tellement de trucs cools (🐸) sur ce serveur que c'est un peu le bordel !\nC'est parti pour vous décrire nos **concepts** :"),
		td("## 🏆 #🏆・server-award\nC'est un **concours du meilleur** serveur que vous connaissez, avant il était mensuel mais vu que les mêmes serveurs revenaient, maintenant pas de régularité :)\n\n## 🗞️ #🗞️・discord-décrypte\nComme Hugo Décryptes (||pas de procès stp||), on vous prépare des **articles sur l'actualité de Discord** ! On est pas super réguliers (en même temps on recherche un/des rédacteurs) mais le mieux serait d'en proposer 1 chaque 2 semaines :o\n\n## 🎨 #🎨・previews\nNom bizarre ouais mais on imagine, créons des **serveurs** fictifs pour de grandes **marques** (Gentle Mates, Burger King tout ça tout ça) !\n\n## ⌨️ #📖・articles\nBon non ce n'est __pas la même chose__ que Discord-Décryptes, c'est des articles générales sur **l'amélioration de vos serveurs** Discord."),
		rule(),
		section([
			"💬 Vous êtes **actifs** = Vous gagnez des rôles sur le serveur\n\n🟢 Niveau **5** = **@Discordien**\n🟢 Niveau **10** = **@Builder**\n🟢 Niveau **17** = **@Wumpus Lover**\n🟢 Niveau **30** = **@Gromodo**",
		], "LEVELS"),
	]

	// Wrap everything in a Container so it renders as one cohesive bordered
	// card (the "actual embed" look) instead of loose components on the
	// channel background. The Container keeps insertion order across the
	// typed add methods (each pushes to one shared array), so we just
	// dispatch each item to the matching method in sequence.
	const container = new ContainerBuilder().setAccentColor(BLURPLE)
	for (const c of items) {
		if (c instanceof MediaGalleryBuilder) container.addMediaGalleryComponents(c)
		else if (c instanceof SectionBuilder) container.addSectionComponents(c)
		else if (c instanceof SeparatorBuilder) container.addSeparatorComponents(c)
		else if (c instanceof TextDisplayBuilder) container.addTextDisplayComponents(c)
	}
	return [container]
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
