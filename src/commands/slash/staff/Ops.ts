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
import { buildUniversalHub } from "./ManagerEmbeds"
import ServerConfig from "../../../schemas/ServerConfig"
import Update from "../../../schemas/Update"
import UpdateTracking from "../../../schemas/UpdateTracking"
import { renderUpdateComponents, FLAG_COMPONENTS_V2 } from "../../../utils/ComponentsV2"
import { TRACK_TYPES, setActiveLocal, draftMarkdownFromChanges } from "../../../utils/updateMode"

const SNOWFLAKE = /^\d{17,20}$/
const todayISO = () => new Date().toISOString().slice(0, 10)
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "update"
/** Parse a comma list of server IDs. */
const parseIds = (s: string | null) => (s || "").split(",").map(x => x.trim()).filter(x => SNOWFLAKE.test(x))

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
	// Each subcommand exposes ONLY its own options in the Discord UI.
	.addSubcommand(s => s
		.setName("install_emojis")
		.setDescription("Install the bundled emoji pack")
		.addStringOption(opt => opt.setName("target").setDescription("Where to install")
			.addChoices(
				{ name: "This Server (members can use)", value: "server" },
				{ name: "Bot Application (bot uses in embeds)", value: "application" }))
		.addStringOption(opt => opt.setName("category").setDescription("Which category — blank for all").setAutocomplete(true))
		.addStringOption(opt => opt.setName("exclude").setDescription("When installing all, skip these (autocomplete keeps adding)").setAutocomplete(true)))
	.addSubcommand(s => s
		.setName("embeds")
		.setDescription("Open the Manage Embeds hub (docs, features, updates)"))
	.addSubcommand(s => s
		.setName("set_newsletter")
		.setDescription("Set a server's newsletter / changelog channel")
		.addStringOption(opt => opt.setName("channel").setDescription("Channel ID to post updates in").setRequired(true))
		.addStringOption(opt => opt.setName("server").setDescription("Server ID — blank uses the current server")))
	.addSubcommand(s => s
		.setName("create_update")
		.setDescription("Save a new update from a markdown file")
		.addStringOption(opt => opt.setName("title").setDescription("Update title").setRequired(true))
		.addAttachmentOption(opt => opt.setName("file").setDescription("The .md file").setRequired(true))
		.addStringOption(opt => opt.setName("date").setDescription("YYYY-MM-DD — blank = today"))
		.addStringOption(opt => opt.setName("version").setDescription("Version label, e.g. 2.0"))
		.addStringOption(opt => opt.setName("banner").setDescription("Hero banner image URL")))
	.addSubcommand(s => s
		.setName("view_update")
		.setDescription("Preview a saved update")
		.addStringOption(opt => opt.setName("update").setDescription("Which update").setRequired(true).setAutocomplete(true)))
	.addSubcommand(s => s
		.setName("send_update")
		.setDescription("Broadcast a saved update to servers")
		.addStringOption(opt => opt.setName("update").setDescription("Which update").setRequired(true).setAutocomplete(true))
		.addStringOption(opt => opt.setName("scope").setDescription("Target")
			.addChoices(
				{ name: "All configured servers", value: "all" },
				{ name: "All except (server = IDs to skip)", value: "all-except" },
				{ name: "Specific (server = IDs to send to)", value: "specific" }))
		.addStringOption(opt => opt.setName("server").setDescription("Comma-separated server IDs (for specific / all-except)")))
	.addSubcommand(s => s
		.setName("list_updates")
		.setDescription("List all saved updates"))
	.addSubcommand(s => s
		.setName("delete_update")
		.setDescription("Delete a saved update")
		.addStringOption(opt => opt.setName("update").setDescription("Which update").setRequired(true).setAutocomplete(true)))
	.addSubcommand(s => s
		.setName("track_start")
		.setDescription("Update Mode: start tracking this server's changes")
		.addStringOption(opt => opt.setName("scope").setDescription("What to track")
			.addChoices(
				{ name: "All change types", value: "all" },
				{ name: "One type (set 'types')", value: "one" },
				{ name: "All except (set 'types' to skip)", value: "all-except" }))
		.addStringOption(opt => opt.setName("types").setDescription("channels, roles, emojis, settings, bots").setAutocomplete(true)))
	.addSubcommand(s => s
		.setName("track_status")
		.setDescription("Update Mode: show tracking status + changes so far"))
	.addSubcommand(s => s
		.setName("track_finish")
		.setDescription("Update Mode: stop & turn tracked changes into a draft update"))
	.addSubcommand(s => s
		.setName("track_cancel")
		.setDescription("Update Mode: stop & discard tracked changes"))
	.setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
	.setBasePermission({ Level: PermissionLevel.Developer, IsUser: [OWNER_ID] })
	.setAutocompleteExecutor(async (interaction: AutocompleteInteraction) => {
		const focused = interaction.options.getFocused(true)

		// Saved-update picker (View / Send / Delete)
		if (focused.name === "update") {
			try {
				const q = focused.value.toLowerCase()
				const docs = await Update.find().sort({ date: -1, createdAt: -1 }).limit(50).lean()
				const choices = docs
					.map((u: any) => ({
						name: `${u.date} · ${u.title}${u.version ? ` · v${u.version}` : ""}${u.status === "draft" ? " (draft)" : ""}`.slice(0, 100),
						value: u.updateId,
					}))
					.filter(c => c.name.toLowerCase().includes(q) || c.value.toLowerCase().includes(q))
					.slice(0, 25)
				await interaction.respond(choices)
			} catch { await interaction.respond([]) }
			return
		}

		// Tracked-type multi-picker (track_start)
		if (focused.name === "types") {
			const parts = focused.value.split(",")
			const current = (parts[parts.length - 1] || "").trim().toLowerCase()
			const chosen = parts.slice(0, -1).map(s => s.trim()).filter(Boolean)
			const chosenLower = new Set(chosen.map(s => s.toLowerCase()))
			const suggestions = (TRACK_TYPES as readonly string[])
				.filter(t => !chosenLower.has(t) && t.includes(current))
				.slice(0, 25)
				.map(t => { const full = [...chosen, t].join(", ").slice(0, 100); return { name: full, value: full } })
			await interaction.respond(suggestions)
			return
		}

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

		const action = interaction.options.getSubcommand()

		// ─── Manage Embeds → open the embeds hub (owner browse, ephemeral) ───
		if (action === "embeds") {
			const { embed, rows } = buildUniversalHub()
			await interaction.reply({ embeds: [embed], components: rows as any, ephemeral: true })
			return
		}

		// ─── Set Newsletter Channel → upsert per-server config ───
		if (action === "set_newsletter") {
			const serverId = interaction.options.getString("server") || interaction.guildId!
			const channelId = interaction.options.getString("channel")
			if (!SNOWFLAKE.test(serverId)) {
				interaction.reply({ content: `Invalid server ID: \`${serverId}\`.`, ephemeral: true }); return
			}
			if (!channelId || !SNOWFLAKE.test(channelId)) {
				interaction.reply({ content: "Provide a valid **channel** ID (the newsletter/changelog channel).", ephemeral: true }); return
			}
			const guildName = interaction.client.guilds.cache.get(serverId)?.name || ""
			await ServerConfig.findOneAndUpdate(
				{ guildID: serverId },
				{ guildID: serverId, newsletterChannelID: channelId, guildName, updatedAt: new Date() },
				{ upsert: true, new: true },
			)
			await interaction.reply({
				content: `${config.successEmoji} Newsletter channel for ${guildName ? `**${guildName}**` : `\`${serverId}\``} set to <#${channelId}>.`,
				ephemeral: true,
			})
			return
		}

		// ═══════════════════ UPDATE SYSTEM ═══════════════════

		// ─── Create Update (from a .md attachment) ───
		if (action === "create_update") {
			const file = interaction.options.getAttachment("file")
			const title = interaction.options.getString("title")
			if (!title) { interaction.reply({ content: "Provide a **title**.", ephemeral: true }); return }
			if (!file) { interaction.reply({ content: "Attach a **.md** file as `file`.", ephemeral: true }); return }
			const date = (interaction.options.getString("date") || todayISO()).slice(0, 10)
			const version = interaction.options.getString("version") || ""
			const banner = interaction.options.getString("banner") || ""
			await interaction.deferReply({ ephemeral: true })

			let markdown = ""
			try {
				const res = await fetch(file.url)
				if (!res.ok) throw new Error(`fetch ${res.status}`)
				markdown = await res.text()
			} catch (e: any) {
				await interaction.editReply({ content: `Couldn't read the file: ${e?.message || e}` }); return
			}
			if (markdown.length > 100_000) { await interaction.editReply({ content: "File too large (max 100KB of markdown)." }); return }

			let updateId = `${date}-${slugify(title)}`
			let n = 2
			while (await Update.exists({ updateId })) updateId = `${date}-${slugify(title)}-${n++}`
			await Update.create({ updateId, title, date, version, banner, markdown, createdBy: interaction.user.id, status: "draft" })

			try {
				const comps = await renderUpdateComponents(interaction.client, { title, date, version, banner, markdown })
				await interaction.editReply({ content: `${config.successEmoji} Saved **${title}** (\`${updateId}\`) as a draft. Preview ↓` })
				await interaction.followUp({ flags: FLAG_COMPONENTS_V2 as any, components: comps as any, ephemeral: true })
			} catch (e: any) {
				await interaction.editReply({ content: `${config.successEmoji} Saved **${title}** (\`${updateId}\`), but preview failed: ${e?.message || e}` })
			}
			return
		}

		// ─── View Update (ephemeral preview) ───
		if (action === "view_update") {
			const id = interaction.options.getString("update")
			if (!id) { interaction.reply({ content: "Pick an **update**.", ephemeral: true }); return }
			const u = await Update.findOne({ updateId: id }).lean() as any
			if (!u) { interaction.reply({ content: `No update \`${id}\`.`, ephemeral: true }); return }
			await interaction.deferReply({ ephemeral: true })
			try {
				const comps = await renderUpdateComponents(interaction.client, u)
				await interaction.editReply({ content: `Preview of **${u.title}** (\`${id}\`):` })
				await interaction.followUp({ flags: FLAG_COMPONENTS_V2 as any, components: comps as any, ephemeral: true })
			} catch (e: any) {
				await interaction.editReply({ content: `Render failed: ${e?.message || e}` })
			}
			return
		}

		// ─── Send Update (targeting: all / all-except / specific) ───
		if (action === "send_update") {
			const id = interaction.options.getString("update")
			const scope = interaction.options.getString("scope") || "all"
			if (!id) { interaction.reply({ content: "Pick an **update**.", ephemeral: true }); return }
			const u = await Update.findOne({ updateId: id }) as any
			if (!u) { interaction.reply({ content: `No update \`${id}\`.`, ephemeral: true }); return }
			await interaction.deferReply({ ephemeral: true })

			const configs = await ServerConfig.find({ newsletterChannelID: { $ne: "" } }).lean() as any[]
			const ids = parseIds(interaction.options.getString("server"))
			let targets = configs
			if (scope === "specific") targets = configs.filter(c => ids.includes(c.guildID))
			else if (scope === "all-except") targets = configs.filter(c => !ids.includes(c.guildID))
			if (!targets.length) {
				await interaction.editReply({ content: "No target servers. Configure newsletter channels first with **Set Newsletter Channel**, and for specific/all-except pass valid server IDs in `server`." })
				return
			}

			const comps = await renderUpdateComponents(interaction.client, u)
			let sent = 0
			const fails: string[] = []
			for (const cfg of targets) {
				try {
					const ch = await interaction.client.channels.fetch(cfg.newsletterChannelID)
					if (!ch || !ch.isTextBased() || !("send" in ch)) throw new Error("not a sendable text channel")
					const msg = await (ch as any).send({ flags: FLAG_COMPONENTS_V2, components: comps })
					u.sentTo.push({ guildID: cfg.guildID, channelID: cfg.newsletterChannelID, messageID: msg.id, sentAt: new Date() })
					sent++
				} catch (e: any) {
					if (fails.length < 6) fails.push(`• ${cfg.guildName || cfg.guildID}: ${e?.message || e}`)
				}
			}
			u.status = "published"
			await u.save()

			const lines = [
				`${config.successEmoji} Sent **${u.title}** to **${sent}** server${sent === 1 ? "" : "s"} (scope: ${scope}).`,
				fails.length ? `Failed ${fails.length}:\n${fails.join("\n")}` : "",
			].filter(Boolean)
			await interaction.editReply({ content: lines.join("\n") })
			return
		}

		// ─── List Updates ───
		if (action === "list_updates") {
			const docs = await Update.find().sort({ date: -1, createdAt: -1 }).limit(25).lean() as any[]
			if (!docs.length) { interaction.reply({ content: "No saved updates yet — create one with **Create Update**.", ephemeral: true }); return }
			const lines = docs.map(u =>
				`• \`${u.updateId}\` — **${u.title}** · ${u.date}${u.version ? ` · v${u.version}` : ""} · ${u.status}${u.sentTo?.length ? ` · sent ${u.sentTo.length}×` : ""}`)
			interaction.reply({ content: `**Saved updates (${docs.length})**\n${lines.join("\n").slice(0, 1900)}`, ephemeral: true })
			return
		}

		// ─── Delete Update ───
		if (action === "delete_update") {
			const id = interaction.options.getString("update")
			if (!id) { interaction.reply({ content: "Pick an **update**.", ephemeral: true }); return }
			const r = await Update.deleteOne({ updateId: id })
			interaction.reply({ content: r.deletedCount ? `${config.successEmoji} Deleted \`${id}\`.` : `No update \`${id}\`.`, ephemeral: true })
			return
		}

		// ═══════════════════ UPDATE MODE (tracking) ═══════════════════

		// ─── Start tracking ───
		if (action === "track_start") {
			const scope = interaction.options.getString("scope") || "all"
			const raw = (interaction.options.getString("types") || "")
				.split(",").map(s => s.trim().toLowerCase()).filter(t => (TRACK_TYPES as readonly string[]).includes(t))
			let types: string[]
			if (scope === "all") types = [...TRACK_TYPES]
			else if (scope === "one") {
				if (!raw.length) { interaction.reply({ content: `For scope **One**, set \`types\` to a single type (${TRACK_TYPES.join(", ")}).`, ephemeral: true }); return }
				types = [raw[0]]
			} else {
				types = (TRACK_TYPES as readonly string[]).filter(t => !raw.includes(t))
			}
			if (!types.length) { interaction.reply({ content: "No change types left to track.", ephemeral: true }); return }
			await UpdateTracking.findOneAndUpdate(
				{ guildID: interaction.guildId },
				{ guildID: interaction.guildId, active: true, scope, types, startedAt: new Date(), startedBy: interaction.user.id, changes: [] },
				{ upsert: true },
			)
			setActiveLocal(interaction.guildId!, true)
			interaction.reply({ content: `${config.successEmoji} **Update Mode ON** for this server.\nTracking: **${types.join(", ")}**.\nMake your changes, then run \`/ops track_finish\`.`, ephemeral: true })
			return
		}

		// ─── Tracking status ───
		if (action === "track_status") {
			const doc = await UpdateTracking.findOne({ guildID: interaction.guildId }).lean() as any
			if (!doc || !doc.active) { interaction.reply({ content: "Update Mode is **off** here. Start with `/ops track_start`.", ephemeral: true }); return }
			const counts: Record<string, number> = {}
			for (const c of doc.changes) counts[c.type] = (counts[c.type] || 0) + 1
			const summary = Object.entries(counts).map(([t, n]) => `• ${t}: ${n}`).join("\n") || "• (none yet)"
			interaction.reply({ content: `**Update Mode ON** · tracking ${doc.types.join(", ")}\n**${doc.changes.length}** change(s) recorded:\n${summary}`, ephemeral: true })
			return
		}

		// ─── Finish tracking → draft update ───
		if (action === "track_finish") {
			const doc = await UpdateTracking.findOne({ guildID: interaction.guildId }) as any
			if (!doc || !doc.active) { interaction.reply({ content: "Update Mode isn't active here. Start with `/ops track_start`.", ephemeral: true }); return }
			doc.active = false
			await doc.save()
			setActiveLocal(interaction.guildId!, false)
			await interaction.deferReply({ ephemeral: true })

			const md = draftMarkdownFromChanges(doc.changes)
			const date = todayISO()
			let updateId = `${date}-server-update`
			let n = 2
			while (await Update.exists({ updateId })) updateId = `${date}-server-update-${n++}`
			const title = `Server Update ${date}`
			await Update.create({ updateId, title, date, version: "", banner: "", markdown: md, createdBy: interaction.user.id, status: "draft" })

			try {
				const comps = await renderUpdateComponents(interaction.client, { title, date, markdown: md })
				await interaction.editReply({ content: `${config.successEmoji} **Update Mode OFF.** Logged **${doc.changes.length}** change(s) → draft \`${updateId}\`. Edit + add your off-Discord changes, then send with \`/ops send_update\`. Preview ↓` })
				await interaction.followUp({ flags: FLAG_COMPONENTS_V2 as any, components: comps as any, ephemeral: true })
			} catch (e: any) {
				await interaction.editReply({ content: `${config.successEmoji} Saved draft \`${updateId}\` (${doc.changes.length} changes), preview failed: ${e?.message || e}` })
			}
			return
		}

		// ─── Cancel tracking (discard) ───
		if (action === "track_cancel") {
			const doc = await UpdateTracking.findOne({ guildID: interaction.guildId }) as any
			if (!doc || !doc.active) { interaction.reply({ content: "Update Mode isn't active here.", ephemeral: true }); return }
			doc.active = false
			doc.changes = []
			await doc.save()
			setActiveLocal(interaction.guildId!, false)
			interaction.reply({ content: `${config.successEmoji} Update Mode **cancelled** — tracked changes discarded.`, ephemeral: true })
			return
		}

		if (action !== "install_emojis") {
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

		const where = target === "application" ? "the bot application" : `**${interaction.guild.name}**`
		const exclNote = exclude ? ` (excluding **${exclude}**)` : ""
		await interaction.deferReply({ ephemeral: true })

		// Fetch what's already at the target FIRST, then filter the pack down
		// to only the not-yet-installed ones. This is what makes re-runs
		// actually CONTINUE: each run skips the already-present emojis and
		// takes the next chunk, instead of re-checking the same first batch.
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
			// Progress edit every 8, and pace to respect rate limits
			if ((i + 1) % 8 === 0) {
				await interaction.editReply({ content: `${config.loadingEmoji} Installing into ${where}… **${installed}** done · ${skipped} skipped · ${i + 1}/${batch.length}` }).catch(() => {})
			}
			await sleep(CREATE_DELAY_MS)
		}

		const remaining = overflow + skipped + failed   // not-yet-installed after this run
		const lines = [
			`${config.successEmoji} **Emoji install complete** — ${where}`,
			`• Installed this run: **${installed}**`,
			alreadyThere ? `• Already present (skipped): ${alreadyThere}` : "",
			failed ? `• Failed: ${failed}` : "",
			capHit ? `• ⚠️ Hit this server's emoji cap — install remaining categories to another server, or use **target: Bot Application**.` : "",
			(overflow > 0 || (capHit && remaining > 0))
				? `• **Re-run the exact same command to continue** — it skips what's already in and installs the next batch. (${overflow > 0 ? `${overflow} left after the per-run cap` : `${remaining} left`}.)`
				: "",
			errors.length ? `\n${errors.join("\n")}` : "",
		].filter(Boolean)
		await interaction.editReply({ content: lines.join("\n") }).catch(() => {})
	})
