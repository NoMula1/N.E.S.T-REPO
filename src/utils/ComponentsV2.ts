/* ──────────────────────────────────────────────────────────────────
   ComponentsV2 — shared helpers for building Discord "Components V2"
   messages (the rich container/section/banner layout) and resolving
   custom :emoji: tokens.

   Used by /ops Manage Embeds (TestEmbed / docs / features) and the
   Update System (markdown → Components V2).

   Sending a V2 message:
     reply({ flags: FLAG_COMPONENTS_V2 as any, components: [container] as any })
   — NO content / embeds allowed alongside it.
   ────────────────────────────────────────────────────────────────── */
import {
	Client,
	ContainerBuilder,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	SectionBuilder,
	SeparatorBuilder,
	TextDisplayBuilder,
	ThumbnailBuilder,
} from "discord.js"

/* MessageFlags.IsComponentsV2 (1 << 15 = 32768). Raw value because the
   discord-api-types bundled with discord.js predates the typed enum even
   though the runtime supports the flag. */
export const FLAG_COMPONENTS_V2 = 1 << 15

/* ─── Primitive builders ─────────────────────────────────────────── */

/** A markdown text block (renders ##/###, **bold**, __underline__, ||spoiler||, etc.). */
export const v2Text = (markdown: string) => new TextDisplayBuilder().setContent(markdown)

/** A horizontal divider. (SeparatorSpacingSize isn't typed in this build —
    default spacing via setDivider is fine.) */
export const v2Separator = () => new SeparatorBuilder().setDivider(true)

/** A full-width banner from an image URL. */
export const v2Banner = (url: string, alt = "banner") =>
	new MediaGalleryBuilder().addItems(
		new MediaGalleryItemBuilder().setURL(url).setDescription(alt || "banner"))

/** A text section (1–3 markdown blocks) with a right-side thumbnail image. */
export const v2Section = (blocks: string[], thumbnailUrl: string) =>
	new SectionBuilder()
		.addTextDisplayComponents(blocks.slice(0, 3).map(v2Text))
		.setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnailUrl))

/* Any top-level V2 component we know how to place in a container. */
export type V2Item = MediaGalleryBuilder | SectionBuilder | SeparatorBuilder | TextDisplayBuilder

/**
 * Wrap an ordered flat list of V2 components into a single Container so the
 * message renders as one cohesive bordered card. Container preserves
 * insertion order across its typed add methods (each pushes to one shared
 * array), so we just dispatch each item to the matching method in sequence.
 * No accent color is set — matches the clean dark-card look (no left stripe).
 */
export function v2Container(items: V2Item[]): ContainerBuilder {
	const c = new ContainerBuilder()
	for (const it of items) {
		if (it instanceof MediaGalleryBuilder) c.addMediaGalleryComponents(it)
		else if (it instanceof SectionBuilder) c.addSectionComponents(it)
		else if (it instanceof SeparatorBuilder) c.addSeparatorComponents(it)
		else if (it instanceof TextDisplayBuilder) c.addTextDisplayComponents(it)
	}
	return c
}

/* ─── Custom emoji resolution ────────────────────────────────────── */

/**
 * Build a lowercased name → mention map from every custom emoji the bot can
 * use: guild emojis (the bot may use emoji from any guild it's a member of)
 * plus application emojis (usable anywhere). Application emojis win on name
 * collision since they're the canonical bot-owned set.
 */
export async function buildEmojiMap(client: Client): Promise<Map<string, string>> {
	const map = new Map<string, string>()
	for (const e of client.emojis.cache.values()) {
		if (e.name) map.set(e.name.toLowerCase(), e.toString())
	}
	try {
		const app = await client.application?.emojis.fetch()
		app?.forEach(e => { if (e.name) map.set(e.name.toLowerCase(), e.toString()) })
	} catch { /* non-fatal — fall back to whatever guild emojis we have */ }
	return map
}

/**
 * Replace `:name:` tokens in text with the matching custom-emoji mention
 * (`<:name:id>` / `<a:name:id>`). Unknown tokens are left untouched, so
 * Unicode-style usage and unrelated colons are safe.
 */
export function resolveEmojis(text: string, map: Map<string, string>): string {
	return text.replace(/:([a-zA-Z0-9_]{2,32}):/g, (whole, name: string) =>
		map.get(name.toLowerCase()) || whole)
}

/** Convenience: fetch the map and resolve in one call. */
export async function resolveEmojisLive(client: Client, text: string): Promise<string> {
	return resolveEmojis(text, await buildEmojiMap(client))
}

/* ─── Markdown → Components V2 ────────────────────────────────────── */

const BANNER_RE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/
const THUMB_RE = /^>\s*thumb:\s*(\S+)$/i
const HR_RE = /^---+$/

/**
 * Parse update markdown into ordered V2 components.
 *   ![alt](url)   → full-width banner (own line)
 *   ---           → divider
 *   > thumb: url  → the text block containing this line becomes a section
 *                   with that image on the right
 *   everything else → markdown text blocks (## headings, **bold**, etc.)
 * Resolve :emoji: tokens BEFORE calling this.
 */
export function parseMarkdownToV2(markdown: string): V2Item[] {
	const items: V2Item[] = []
	let buffer: string[] = []
	let thumb: string | null = null

	const flush = () => {
		const text = buffer.join("\n").trim()
		buffer = []
		const t = thumb
		thumb = null
		if (!text) return
		if (t) items.push(v2Section([text.slice(0, 3900)], t))
		else items.push(v2Text(text.slice(0, 3900)))
	}

	for (const line of markdown.replace(/\r\n/g, "\n").split("\n")) {
		const trimmed = line.trim()
		if (HR_RE.test(trimmed)) { flush(); items.push(v2Separator()); continue }
		const b = trimmed.match(BANNER_RE)
		if (b) { flush(); items.push(v2Banner(b[2], b[1] || "banner")); continue }
		const th = trimmed.match(THUMB_RE)
		if (th) { thumb = th[1]; continue }   // applies to current block on flush
		buffer.push(line)
	}
	flush()
	return items
}

export interface RenderableUpdate {
	title: string
	date: string
	version?: string
	banner?: string
	markdown: string
}

/**
 * Render a saved update into Components V2 (a single container).
 * Resolves custom emoji, prepends optional hero banner + title/date header,
 * then the parsed body. Caps total components to stay under Discord's limit.
 */
export async function renderUpdateComponents(client: Client, update: RenderableUpdate): Promise<ContainerBuilder[]> {
	const map = await buildEmojiMap(client)
	const md = resolveEmojis(update.markdown || "", map)
	const items: V2Item[] = []
	if (update.banner) items.push(v2Banner(update.banner, update.title))
	const header = `# ${resolveEmojis(update.title, map)}${update.version ? `  ·  v${update.version}` : ""}\n-# ${update.date}`
	items.push(v2Text(header))
	items.push(v2Separator())
	items.push(...parseMarkdownToV2(md))
	return [v2Container(items.slice(0, 38))]
}
