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
