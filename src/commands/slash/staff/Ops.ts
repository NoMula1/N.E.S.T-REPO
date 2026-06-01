/* ──────────────────────────────────────────────────────────────────
   /ops — owner-only operations hub. Extensible via the `action`
   option. First action: emojisinstall — bulk-installs the bundled
   emoji pack (assets/emojis/<Category>/*) into either the current
   server or the bot application.

   Why two targets:
     • This Server   → guild emojis members can use. Capped by Discord
       (50 static + 50 animated, more with boosts) so you install
       per-category.
     • Bot Application → application emojis (up to 2000) that the BOT
       can render in its own messages/embeds anywhere it is — this is
       what powers custom emoji in the bot's embeds.

   Locked to the owner ID. Defense-in-depth: IsUser on the base
   permission AND an explicit id check at the top of the executor.
   ────────────────────────────────────────────────────────────────── */
import { ApplicationEmoji, AutocompleteInteraction, GuildEmoji, PermissionsBitField } from "discord.js"
import { readFileSync, readdirSync, statSync, existsSync } from "fs"
import { join } from "path"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { config } from "../../../utils/config"

const OWNER_ID = "1149913737558499358"
const EMOJI_ROOT = join(process.cwd(), "assets", "emojis")
const MAX_EMOJI_BYTES = 256 * 1024          // Discord per-emoji size cap
const CREATE_DELAY_MS = 1200                 // gap between creates (emoji creation is rate-limited)
const MAX_PER_RUN = 200                       // safety cap so we stay inside the 15-min interaction window

interface PackFile { path: string; name: string; animated: boolean }

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/* List category subfolders of the emoji pack. */
function listCategories(): string[] {
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
function gatherFiles(category: string | null, exclude: string | null): PackFile[] {
	const used = new Set<string>()
	const out: PackFile[] = []
	let cats = category && category !== "(all)" ? [category] : listCategories()
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

export default new CommandExecutor()
	.setName("ops")
	.setDescription("Owner operations")
	.addStringOption(opt =>
		opt.setName("action")
			.setDescription("Which operation to run")
			.setRequired(true)
			.addChoices({ name: "Install Emojis", value: "emojisinstall" }))
	.addStringOption(opt =>
		opt.setName("target")
			.setDescription("Where to install the emojis")
			.setRequired(false)
			.addChoices(
				{ name: "This Server (members can use)", value: "server" },
				{ name: "Bot Application (bot uses in embeds)", value: "application" },
			))
	.addStringOption(opt =>
		opt.setName("category")
			.setDescription("Which category to install — leave blank for all")
			.setRequired(false)
			.setAutocomplete(true))
	.addStringOption(opt =>
		opt.setName("exclude")
			.setDescription("When installing all, skip these categories (autocomplete keeps adding to the list)")
			.setRequired(false)
			.setAutocomplete(true))
	.setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
	.setBasePermission({ Level: PermissionLevel.Developer, IsUser: [OWNER_ID] })
	.setAutocompleteExecutor(async (interaction: AutocompleteInteraction) => {
		const focused = interaction.options.getFocused(true)

		if (focused.name === "exclude") {
			// Multi-select via comma accumulation: keep everything before the
			// last comma as already-chosen, suggest categories for the fragment
			// after it, and return the FULL accumulated string as each value so
			// picking one appends rather than replaces.
			const parts = focused.value.split(",")
			const current = (parts[parts.length - 1] || "").trim().toLowerCase()
			const chosen = parts.slice(0, -1).map(s => s.trim()).filter(Boolean)
			const chosenLower = new Set(chosen.map(s => s.toLowerCase()))
			const suggestions = listCategories()
				.filter(c => !chosenLower.has(c.toLowerCase()) && c.toLowerCase().includes(current))
				.slice(0, 25)
				.map(c => {
					const full = [...chosen, c].join(", ").slice(0, 100)   // Discord value cap
					return { name: full, value: full }
				})
			await interaction.respond(suggestions)
			return
		}

		// `category` — single value, also offers "(all)".
		const choices = ["(all)", ...listCategories()]
			.filter(c => c.toLowerCase().includes(focused.value.toLowerCase()))
			.slice(0, 25)
			.map(c => ({ name: c, value: c }))
		await interaction.respond(choices)
	})
	.setExecutor(async interaction => {
		// Hard owner gate — ignores the dev list / admin bypass.
		if (interaction.user.id !== OWNER_ID) {
			interaction.reply({ content: "This command is locked to the owner.", ephemeral: true })
			return
		}
		if (!interaction.inCachedGuild()) {
			interaction.reply({ content: "Run this inside a server.", ephemeral: true })
			return
		}

		const action = interaction.options.getString("action", true)
		if (action !== "emojisinstall") {
			interaction.reply({ content: `Unknown action: \`${action}\`.`, ephemeral: true })
			return
		}

		const target = interaction.options.getString("target") || "server"
		const category = interaction.options.getString("category")
		const exclude = interaction.options.getString("exclude")

		const files = gatherFiles(category, exclude)
		if (!files.length) {
			interaction.reply({ content: `No emoji files found${category && category !== "(all)" ? ` in category \`${category}\`` : ""}${exclude ? ` (excluding \`${exclude}\`)` : ""}. Pack lives at \`assets/emojis/<Category>/\`.`, ephemeral: true })
			return
		}

		const batch = files.slice(0, MAX_PER_RUN)
		const overflow = files.length - batch.length
		const where = target === "application" ? "the bot application" : `**${interaction.guild.name}**`
		const exclNote = exclude ? ` (excluding **${exclude}**)` : ""
		await interaction.reply({
			content: `${config.loadingEmoji} Installing **${batch.length}** emoji${batch.length === 1 ? "" : "s"} into ${where}${exclNote}…${overflow > 0 ? `\n(${overflow} over the ${MAX_PER_RUN}/run cap — re-run to continue.)` : ""}`,
			ephemeral: true,
		})

		// Pre-load existing names at the target to skip duplicates.
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
			// Progress edit every 8, and pace to respect rate limits
			if ((i + 1) % 8 === 0) {
				await interaction.editReply({ content: `${config.loadingEmoji} Installing into ${where}… **${installed}** done · ${skipped} skipped · ${i + 1}/${batch.length}` }).catch(() => {})
			}
			await sleep(CREATE_DELAY_MS)
		}

		const lines = [
			`${config.successEmoji} **Emoji install complete** — ${where}`,
			`• Installed: **${installed}**`,
			skipped ? `• Skipped (already exist): ${skipped}` : "",
			failed ? `• Failed: ${failed}` : "",
			capHit ? `• ⚠️ Hit this server's emoji cap — install remaining categories to another server, or use **target: Bot Application**.` : "",
			overflow > 0 ? `• ${overflow} more over the ${MAX_PER_RUN}/run cap — re-run to continue.` : "",
			errors.length ? `\n${errors.join("\n")}` : "",
		].filter(Boolean)
		await interaction.editReply({ content: lines.join("\n") }).catch(() => {})
	})
