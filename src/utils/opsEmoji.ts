/* ──────────────────────────────────────────────────────────────────
   opsEmoji — the bundled emoji-pack reader + installer, factored out of
   Ops.ts so the /ops control panel (and its modal flow) can reuse it.

   Two install targets:
     • This Server   → guild emojis members can use. Capped by Discord
       (50 static + 50 animated, more with boosts) so you install
       per-category.
     • Bot Application → application emojis (up to 2000) the BOT renders
       in its own messages/embeds anywhere it is.
   ────────────────────────────────────────────────────────────────── */
import { ApplicationEmoji, GuildEmoji } from "discord.js"
import { readFileSync, readdirSync, statSync, existsSync } from "fs"
import { join } from "path"
import { config } from "./config"

export const EMOJI_ROOT = join(process.cwd(), "assets", "emojis")
const MAX_EMOJI_BYTES = 256 * 1024          // Discord per-emoji size cap
const CREATE_DELAY_MS = 1200                 // gap between creates (emoji creation is rate-limited)
const MAX_PER_RUN = 200                       // safety cap so we stay inside the 15-min interaction window

interface PackFile { path: string; name: string; animated: boolean }

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/* List category subfolders of the emoji pack. */
export function listCategories(): string[] {
	if (!existsSync(EMOJI_ROOT)) return []
	return readdirSync(EMOJI_ROOT)
		.filter(d => { try { return statSync(join(EMOJI_ROOT, d)).isDirectory() } catch { return false } })
		.sort()
}

/* Sanitize a filename into a valid emoji name (2-32 chars, [a-zA-Z0-9_]),
   deduping against names already used this run. */
function emojiName(file: string, used: Set<string>): string {
	let base = file.replace(/\.[^.]+$/, "")               // strip extension
		.replace(/[^a-zA-Z0-9_]+/g, "_")                  // invalid → underscore
		.replace(/_+/g, "_").replace(/^_|_$/g, "")        // collapse + trim
	if (base.length < 2) base = `e_${base}`
	base = base.slice(0, 32)
	let name = base
	let i = 2
	while (used.has(name.toLowerCase())) {
		const suffix = `_${i++}`
		name = base.slice(0, 32 - suffix.length) + suffix
	}
	used.add(name.toLowerCase())
	return name
}

/* Parse a comma-separated exclude string into a lowercased name set. */
function parseExclude(exclude: string | null): Set<string> {
	return new Set((exclude || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean))
}

/* Gather pack files, optionally scoped to one category, optionally
   excluding one or more categories (comma-separated; only meaningful
   when installing all). */
export function gatherFiles(category: string | null, exclude: string | null): PackFile[] {
	const used = new Set<string>()
	const out: PackFile[] = []
	let cats = category && category.toLowerCase() !== "(all)" && category.trim() ? [category] : listCategories()
	const excludeSet = parseExclude(exclude)
	if (excludeSet.size) cats = cats.filter(c => !excludeSet.has(c.toLowerCase()))
	for (const cat of cats) {
		const dir = join(EMOJI_ROOT, cat)
		if (!existsSync(dir)) continue
		let entries: string[]
		try { entries = readdirSync(dir) } catch { continue }
		for (const f of entries.sort()) {
			if (!/\.(png|gif)$/i.test(f)) continue
			const full = join(dir, f)
			try { if (statSync(full).size > MAX_EMOJI_BYTES) continue } catch { continue }
			out.push({ path: full, name: emojiName(f, used), animated: /\.gif$/i.test(f) })
		}
	}
	return out
}

/**
 * Install the bundled pack into the chosen target. Assumes `interaction`
 * has NOT yet been replied to — it defers ephemerally and edits progress.
 * Re-runs CONTINUE: existing emoji are fetched first and skipped, so the
 * next run installs the next batch.
 */
export async function installEmojiPack(
	interaction: any,
	opts: { target: "server" | "application"; category: string | null; exclude: string | null },
): Promise<void> {
	const { target, category, exclude } = opts
	if (target !== "application" && !interaction.guild) {
		await interaction.reply({ content: "Run this inside a server to install **This Server** emojis.", ephemeral: true })
		return
	}

	const files = gatherFiles(category, exclude)
	if (!files.length) {
		await interaction.reply({
			content: `No emoji files found${category && category.toLowerCase() !== "(all)" ? ` in category \`${category}\`` : ""}${exclude ? ` (excluding \`${exclude}\`)` : ""}. Pack lives at \`assets/emojis/<Category>/\`.`,
			ephemeral: true,
		})
		return
	}

	const where = target === "application" ? "the bot application" : `**${interaction.guild.name}**`
	const exclNote = exclude ? ` (excluding **${exclude}**)` : ""
	await interaction.deferReply({ ephemeral: true })

	// Fetch what's already at the target FIRST, then filter the pack down to
	// only the not-yet-installed ones — this is what makes re-runs CONTINUE.
	let existing = new Set<string>()
	try {
		if (target === "application") {
			const coll = await interaction.client.application!.emojis.fetch()
			existing = new Set(coll.map((e: ApplicationEmoji) => e.name?.toLowerCase() || ""))
		} else {
			const coll = await interaction.guild.emojis.fetch()
			existing = new Set(coll.map((e: GuildEmoji) => e.name?.toLowerCase() || ""))
		}
	} catch { /* non-fatal */ }

	const pending = files.filter(f => !existing.has(f.name.toLowerCase()))
	const alreadyThere = files.length - pending.length
	if (!pending.length) {
		await interaction.editReply({ content: `${config.successEmoji} All **${files.length}** emoji${files.length === 1 ? "" : "s"} are already installed in ${where}. Nothing to do.` })
		return
	}

	const batch = pending.slice(0, MAX_PER_RUN)
	const overflow = pending.length - batch.length
	await interaction.editReply({
		content: `${config.loadingEmoji} Installing **${batch.length}** emoji${batch.length === 1 ? "" : "s"} into ${where}${exclNote}…`
			+ (alreadyThere ? `\n(${alreadyThere} already there — skipping.)` : "")
			+ (overflow > 0 ? `\n(${overflow} remaining after this run — re-run to continue.)` : ""),
	})

	let installed = 0, skipped = 0, failed = 0, capHit = false
	const errors: string[] = []

	for (let i = 0; i < batch.length; i++) {
		const f = batch[i]
		if (existing.has(f.name.toLowerCase())) { skipped++; continue }
		try {
			const attachment = readFileSync(f.path)
			if (target === "application") {
				await interaction.client.application!.emojis.create({ attachment, name: f.name })
			} else {
				await interaction.guild.emojis.create({ attachment, name: f.name })
			}
			installed++
		} catch (e: any) {
			// 30008 = Maximum number of emojis reached (guild cap)
			if (e?.code === 30008) { capHit = true; break }
			failed++
			if (errors.length < 5) errors.push(`\`${f.name}\`: ${e?.message || "error"}`)
		}
		if ((i + 1) % 8 === 0) {
			await interaction.editReply({ content: `${config.loadingEmoji} Installing into ${where}… **${installed}** done · ${skipped} skipped · ${i + 1}/${batch.length}` }).catch(() => {})
		}
		await sleep(CREATE_DELAY_MS)
	}

	const remaining = overflow + skipped + failed
	const lines = [
		`${config.successEmoji} **Emoji install complete** — ${where}`,
		`• Installed this run: **${installed}**`,
		alreadyThere ? `• Already present (skipped): ${alreadyThere}` : "",
		failed ? `• Failed: ${failed}` : "",
		capHit ? `• ⚠️ Hit this server's emoji cap — install remaining categories to another server, or use **target: Bot Application**.` : "",
		(overflow > 0 || (capHit && remaining > 0))
			? `• **Re-run the same install to continue** — it skips what's already in and installs the next batch. (${overflow > 0 ? `${overflow} left after the per-run cap` : `${remaining} left`}.)`
			: "",
		errors.length ? `\n${errors.join("\n")}` : "",
	].filter(Boolean)
	await interaction.editReply({ content: lines.join("\n") }).catch(() => {})
}
