/* ──────────────────────────────────────────────────────────────────
   OpsHub — interaction router for the single `/ops` control panel.

   Claims every `ops_*` button / select / modal interaction. Owner-locked.
   Navigation buttons swap the panel in place (interaction.update); actions
   collect their inputs via modals + menus and report results ephemerally,
   so nothing from one action ever clutters another. See utils/opsHub.ts
   for the customId scheme + builders.
   ────────────────────────────────────────────────────────────────── */
import { Events, Interaction } from "discord.js"
import { EventOptions } from "../../utils/RegisterEvents"
import { config } from "../../utils/config"
import ServerConfig from "../../schemas/ServerConfig"
import Update from "../../schemas/Update"
import UpdateTracking from "../../schemas/UpdateTracking"
import { renderUpdateComponents, FLAG_COMPONENTS_V2 } from "../../utils/ComponentsV2"
import { TRACK_TYPES, setActiveLocal, draftMarkdownFromChanges } from "../../utils/updateMode"
import { installEmojiPack } from "../../utils/opsEmoji"
import {
	OWNER_ID, SNOWFLAKE, todayISO, slugify, parseIds,
	buildRootPanel, buildUpdatesPanel, buildModePanel, buildConfigPanel, buildEmojiPanel,
	updateSelectRow, serverSelectRow, scopeRows, deleteConfirmRow, backRow,
	createUpdateModal, newsletterModal, emojiModal,
} from "../../utils/opsHub"

const ACK_SEND = "📤 Sending…"
const ack = (content: string) => ({ content, embeds: [] as any[], components: [] as any[] })

export default {
	name: Events.InteractionCreate,
	once: false,
	async execute(_: EventOptions, interaction: Interaction) {
		const id = (interaction as any).customId as string | undefined
		if (!id || !id.startsWith("ops_")) return

		// Hard owner gate (the panel is ephemeral, but defend anyway).
		if (interaction.user.id !== OWNER_ID) {
			if ("reply" in interaction && typeof (interaction as any).reply === "function") {
				await (interaction as any).reply({ content: "This panel is locked to the owner.", ephemeral: true }).catch(() => {})
			}
			return
		}

		try {
			if (interaction.isModalSubmit()) return await handleModal(interaction, id)
			if (interaction.isStringSelectMenu()) return await handleSelect(interaction, id)
			if (interaction.isButton()) return await handleButton(interaction, id)
		} catch (e: any) {
			const msg = `Something went wrong: ${e?.message || e}`
			try {
				if ((interaction as any).deferred || (interaction as any).replied) await (interaction as any).followUp({ content: msg, ephemeral: true })
				else await (interaction as any).reply({ content: msg, ephemeral: true })
			} catch { /* ignore */ }
		}
	},
}

/* ═══════════════════════ Buttons ═══════════════════════ */
async function handleButton(interaction: any, id: string) {
	// ─── Navigation (swap panel in place) ───
	if (id === "ops_nav_root") return interaction.update(panel(buildRootPanel()))
	if (id === "ops_nav_updates") return interaction.update(panel(buildUpdatesPanel()))
	if (id === "ops_nav_mode") return interaction.update(panel(buildModePanel()))
	if (id === "ops_nav_config") return interaction.update(panel(buildConfigPanel()))
	if (id === "ops_nav_emojis") return interaction.update(panel(buildEmojiPanel()))

	// ─── Modals ───
	if (id === "ops_upd_create") return interaction.showModal(createUpdateModal())
	if (id === "ops_cfg_news") return interaction.showModal(newsletterModal())
	if (id === "ops_emoji_install_server") return interaction.showModal(emojiModal("server"))
	if (id === "ops_emoji_install_application") return interaction.showModal(emojiModal("application"))

	// ─── Updates ───
	if (id === "ops_upd_list") return replyUpdateList(interaction)
	if (id === "ops_upd_view") return openUpdatePicker(interaction, "ops_view_pick", "Pick an update to preview…")
	if (id === "ops_upd_send") return openUpdatePicker(interaction, "ops_send_pick", "Pick an update to send…")
	if (id === "ops_upd_delete") return openUpdatePicker(interaction, "ops_del_pick", "Pick an update to delete…")

	if (id.startsWith("ops_send_all_")) {
		await interaction.update(ack(ACK_SEND))
		return doSend(interaction, id.slice("ops_send_all_".length), "all", [])
	}
	if (id.startsWith("ops_send_except_")) return openServerPicker(interaction, id.slice("ops_send_except_".length), "all-except")
	if (id.startsWith("ops_send_specific_")) return openServerPicker(interaction, id.slice("ops_send_specific_".length), "specific")

	if (id.startsWith("ops_del_confirm_")) {
		const updateId = id.slice("ops_del_confirm_".length)
		const r = await Update.deleteOne({ updateId })
		return interaction.update({
			content: r.deletedCount ? `${config.successEmoji} Deleted \`${updateId}\`.` : `No update \`${updateId}\` found.`,
			embeds: [], components: [backRow("ops_nav_updates", "Back to Updates")],
		})
	}

	// ─── Update Mode ───
	if (id === "ops_mode_startall") return startTracking(interaction, [...TRACK_TYPES])
	if (id === "ops_mode_status") return replyTrackStatus(interaction)
	if (id === "ops_mode_finish") return finishTracking(interaction)
	if (id === "ops_mode_cancel") return cancelTracking(interaction)

	// ─── Configure ───
	if (id === "ops_cfg_list") return replyConfigList(interaction)
}

/* ═══════════════════════ Selects ═══════════════════════ */
async function handleSelect(interaction: any, id: string) {
	if (id === "ops_mode_types") return startTracking(interaction, interaction.values)

	if (id === "ops_view_pick") {
		const updateId = interaction.values[0]
		const u = await Update.findOne({ updateId }).lean() as any
		if (!u) return interaction.update({ content: `No update \`${updateId}\`.`, embeds: [], components: [backRow("ops_nav_updates")] })
		await interaction.update(ack("🖼️ Rendering preview…"))
		try {
			const comps = await renderUpdateComponents(interaction.client, u)
			await interaction.editReply({ content: `Preview of **${u.title}** (\`${updateId}\`):`, components: [backRow("ops_nav_updates", "Back to Updates")] })
			await interaction.followUp({ flags: FLAG_COMPONENTS_V2 as any, components: comps as any, ephemeral: true })
		} catch (e: any) {
			await interaction.editReply({ content: `Render failed: ${e?.message || e}`, components: [backRow("ops_nav_updates")] })
		}
		return
	}

	if (id === "ops_send_pick") {
		const updateId = interaction.values[0]
		const u = await Update.findOne({ updateId }).lean() as any
		if (!u) return interaction.update({ content: `No update \`${updateId}\`.`, embeds: [], components: [backRow("ops_nav_updates")] })
		const { content, rows } = scopeRows(updateId, u.title)
		return interaction.update({ content, embeds: [], components: rows as any })
	}

	if (id === "ops_del_pick") {
		const updateId = interaction.values[0]
		const u = await Update.findOne({ updateId }).lean() as any
		if (!u) return interaction.update({ content: `No update \`${updateId}\`.`, embeds: [], components: [backRow("ops_nav_updates")] })
		return interaction.update({
			content: `Delete **${u.title}** (\`${updateId}\`)? This can't be undone.`,
			embeds: [], components: [deleteConfirmRow(updateId)],
		})
	}

	if (id.startsWith("ops_sendsrv_except_")) {
		await interaction.update(ack(ACK_SEND))
		return doSend(interaction, id.slice("ops_sendsrv_except_".length), "all-except", interaction.values)
	}
	if (id.startsWith("ops_sendsrv_specific_")) {
		await interaction.update(ack(ACK_SEND))
		return doSend(interaction, id.slice("ops_sendsrv_specific_".length), "specific", interaction.values)
	}
}

/* ═══════════════════════ Modals ═══════════════════════ */
async function handleModal(interaction: any, id: string) {
	// ─── Create update ───
	if (id === "ops_modal_create") {
		const title = (interaction.fields.getTextInputValue("title") || "").trim()
		if (!title) return interaction.reply({ content: "A **title** is required.", ephemeral: true })
		const rawDate = (interaction.fields.getTextInputValue("date") || "").trim()
		const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : todayISO()
		const version = (interaction.fields.getTextInputValue("version") || "").trim()
		const banner = (interaction.fields.getTextInputValue("banner") || "").trim()
		const pasted = (interaction.fields.getTextInputValue("markdown") || "").trim()

		if (pasted) {
			await interaction.deferReply({ ephemeral: true })
			return saveAndPreview(interaction, { title, date, version, banner, markdown: pasted })
		}

		// No paste → collect an uploaded .md file from the owner's next message.
		const channel: any = interaction.channel
		if (!channel || typeof channel.awaitMessages !== "function") {
			return interaction.reply({ content: "Couldn't open an upload here — re-open Create and paste the markdown into the box instead.", ephemeral: true })
		}
		await interaction.reply({ content: "📎 **Upload your `.md` file now** — post it in this channel within 2 minutes. (Or re-open Create and paste the markdown instead.)", ephemeral: true })
		let collected: any
		try {
			collected = await channel.awaitMessages({ filter: (m: any) => m.author.id === OWNER_ID && m.attachments.size > 0, max: 1, time: 120000 })
		} catch { collected = null }
		if (!collected || !collected.size) return interaction.followUp({ content: "No file received — cancelled. Re-open Create to try again.", ephemeral: true })
		const upload = collected.first()
		const file = upload.attachments.first()
		let markdown = ""
		try {
			const res = await fetch(file.url)
			if (!res.ok) throw new Error(`fetch ${res.status}`)
			markdown = await res.text()
		} catch (e: any) {
			return interaction.followUp({ content: `Couldn't read the file: ${e?.message || e}`, ephemeral: true })
		}
		try { await upload.delete() } catch { /* owner's upload; non-fatal if we can't tidy it */ }
		if (markdown.length > 100_000) return interaction.followUp({ content: "File too large (max 100KB of markdown).", ephemeral: true })
		return saveAndPreview(interaction, { title, date, version, banner, markdown })
	}

	// ─── Set newsletter channel ───
	if (id === "ops_modal_news") {
		const serverRaw = (interaction.fields.getTextInputValue("server") || "").trim()
		const channelId = (interaction.fields.getTextInputValue("channel") || "").trim()
		const serverId = serverRaw || interaction.guildId
		if (!serverId || !SNOWFLAKE.test(serverId)) return interaction.reply({ content: `Invalid server ID: \`${serverId}\`.`, ephemeral: true })
		if (!SNOWFLAKE.test(channelId)) return interaction.reply({ content: "Provide a valid **channel** ID (the newsletter / changelog channel).", ephemeral: true })
		const guildName = interaction.client.guilds.cache.get(serverId)?.name || ""
		await ServerConfig.findOneAndUpdate(
			{ guildID: serverId },
			{ guildID: serverId, newsletterChannelID: channelId, guildName, updatedAt: new Date() },
			{ upsert: true, new: true },
		)
		return interaction.reply({
			content: `${config.successEmoji} Newsletter channel for ${guildName ? `**${guildName}**` : `\`${serverId}\``} set to <#${channelId}>.`,
			ephemeral: true,
		})
	}

	// ─── Install emojis (target encoded in modal id) ───
	if (id === "ops_modal_emoji_server" || id === "ops_modal_emoji_application") {
		const target = id.endsWith("application") ? "application" : "server"
		const category = (interaction.fields.getTextInputValue("category") || "").trim() || null
		const exclude = (interaction.fields.getTextInputValue("exclude") || "").trim() || null
		return installEmojiPack(interaction, { target, category, exclude })
	}
}

/* ═══════════════════════ Shared runners ═══════════════════════ */
function panel(p: { embed: any; rows: any[] }) { return { embeds: [p.embed], components: p.rows as any } }

async function replyUpdateList(interaction: any) {
	const docs = await Update.find().sort({ date: -1, createdAt: -1 }).limit(25).lean() as any[]
	if (!docs.length) return interaction.reply({ content: "No saved updates yet — create one with **Create**.", ephemeral: true })
	const lines = docs.map(u =>
		`• \`${u.updateId}\` — **${u.title}** · ${u.date}${u.version ? ` · v${u.version}` : ""} · ${u.status}${u.sentTo?.length ? ` · sent ${u.sentTo.length}×` : ""}`)
	return interaction.reply({ content: `**Saved updates (${docs.length})**\n${lines.join("\n").slice(0, 1900)}`, ephemeral: true })
}

async function openUpdatePicker(interaction: any, customId: string, placeholder: string) {
	const docs = await Update.find().sort({ date: -1, createdAt: -1 }).limit(25).lean() as any[]
	if (!docs.length) return interaction.reply({ content: "No saved updates yet — create one with **Create**.", ephemeral: true })
	return interaction.update({ content: placeholder, embeds: [], components: [updateSelectRow(docs, customId, placeholder), backRow("ops_nav_updates")] as any })
}

async function openServerPicker(interaction: any, updateId: string, mode: "all-except" | "specific") {
	const configs = await ServerConfig.find({ newsletterChannelID: { $ne: "" } }).lean() as any[]
	if (!configs.length) return interaction.update({ content: "No servers configured yet. Set a **newsletter channel** first under **Configure**.", embeds: [], components: [backRow("ops_nav_updates")] })
	const placeholder = mode === "specific" ? "Pick the servers to send to…" : "Pick the servers to SKIP…"
	const customId = `ops_sendsrv_${mode === "specific" ? "specific" : "except"}_${updateId}`
	return interaction.update({ content: placeholder, embeds: [], components: [serverSelectRow(configs, customId, placeholder), backRow("ops_nav_updates")] as any })
}

async function saveAndPreview(interaction: any, data: { title: string; date: string; version: string; banner: string; markdown: string }) {
	const { title, date, version, banner, markdown } = data
	let updateId = `${date}-${slugify(title)}`
	let n = 2
	while (await Update.exists({ updateId })) updateId = `${date}-${slugify(title)}-${n++}`
	await Update.create({ updateId, title, date, version, banner, markdown, createdBy: interaction.user.id, status: "draft" })

	const okMsg = `${config.successEmoji} Saved **${title}** (\`${updateId}\`) as a draft. Send it from **Updates → Send**. Preview ↓`
	const say = async (content: string) => {
		if (interaction.deferred) return interaction.editReply({ content })
		return interaction.followUp({ content, ephemeral: true })
	}
	try {
		const comps = await renderUpdateComponents(interaction.client, { title, date, version, banner, markdown })
		await say(okMsg)
		await interaction.followUp({ flags: FLAG_COMPONENTS_V2 as any, components: comps as any, ephemeral: true })
	} catch (e: any) {
		await say(`${config.successEmoji} Saved **${title}** (\`${updateId}\`), but the preview failed: ${e?.message || e}`)
	}
}

async function doSend(interaction: any, updateId: string, scope: "all" | "all-except" | "specific", ids: string[]) {
	const u = await Update.findOne({ updateId }) as any
	if (!u) return interaction.editReply({ content: `No update \`${updateId}\`.`, components: [backRow("ops_nav_updates")] })

	const configs = await ServerConfig.find({ newsletterChannelID: { $ne: "" } }).lean() as any[]
	const wanted = ids.filter(x => SNOWFLAKE.test(x))
	let targets = configs
	if (scope === "specific") targets = configs.filter(c => wanted.includes(c.guildID))
	else if (scope === "all-except") targets = configs.filter(c => !wanted.includes(c.guildID))
	if (!targets.length) return interaction.editReply({ content: "No target servers matched. Configure newsletter channels under **Configure** first.", components: [backRow("ops_nav_updates")] })

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
	return interaction.editReply({ content: lines.join("\n"), components: [backRow("ops_nav_updates", "Back to Updates")] })
}

async function startTracking(interaction: any, rawTypes: string[]) {
	const types = rawTypes.filter(t => (TRACK_TYPES as readonly string[]).includes(t))
	if (!types.length) return interaction.update({ content: "No valid change types selected.", embeds: [], components: [backRow("ops_nav_mode")] })
	await UpdateTracking.findOneAndUpdate(
		{ guildID: interaction.guildId },
		{ guildID: interaction.guildId, active: true, scope: types.length === TRACK_TYPES.length ? "all" : "one", types, startedAt: new Date(), startedBy: interaction.user.id, changes: [] },
		{ upsert: true },
	)
	setActiveLocal(interaction.guildId, true)
	return interaction.update({
		content: `${config.successEmoji} **Update Mode ON** for this server.\nTracking: **${types.join(", ")}**.\nMake your changes, then come back and hit **Finish**.`,
		embeds: [], components: [backRow("ops_nav_mode", "Back to Update Mode")],
	})
}

async function replyTrackStatus(interaction: any) {
	const doc = await UpdateTracking.findOne({ guildID: interaction.guildId }).lean() as any
	if (!doc || !doc.active) return interaction.reply({ content: "Update Mode is **off** here. Hit **Start** to begin.", ephemeral: true })
	const counts: Record<string, number> = {}
	for (const c of doc.changes) counts[c.type] = (counts[c.type] || 0) + 1
	const summary = Object.entries(counts).map(([t, n]) => `• ${t}: ${n}`).join("\n") || "• (none yet)"
	return interaction.reply({ content: `**Update Mode ON** · tracking ${doc.types.join(", ")}\n**${doc.changes.length}** change(s) recorded:\n${summary}`, ephemeral: true })
}

async function finishTracking(interaction: any) {
	const doc = await UpdateTracking.findOne({ guildID: interaction.guildId }) as any
	if (!doc || !doc.active) return interaction.reply({ content: "Update Mode isn't active here. Hit **Start** first.", ephemeral: true })
	// Ack first (one quick read above), then do the heavier draft + render work.
	await interaction.update(ack("⏳ Finishing & drafting…"))
	doc.active = false
	await doc.save()
	setActiveLocal(interaction.guildId, false)

	const md = draftMarkdownFromChanges(doc.changes)
	const date = todayISO()
	let updateId = `${date}-server-update`
	let n = 2
	while (await Update.exists({ updateId })) updateId = `${date}-server-update-${n++}`
	const title = `Server Update ${date}`
	await Update.create({ updateId, title, date, version: "", banner: "", markdown: md, createdBy: interaction.user.id, status: "draft" })

	try {
		const comps = await renderUpdateComponents(interaction.client, { title, date, markdown: md })
		await interaction.editReply({ content: `${config.successEmoji} **Update Mode OFF.** Logged **${doc.changes.length}** change(s) → draft \`${updateId}\`. Edit it + add off-Discord changes, then send from **Updates → Send**. Preview ↓`, components: [backRow("ops_nav_mode", "Back to Update Mode")] })
		await interaction.followUp({ flags: FLAG_COMPONENTS_V2 as any, components: comps as any, ephemeral: true })
	} catch (e: any) {
		await interaction.editReply({ content: `${config.successEmoji} Saved draft \`${updateId}\` (${doc.changes.length} changes); preview failed: ${e?.message || e}`, components: [backRow("ops_nav_mode")] })
	}
}

async function cancelTracking(interaction: any) {
	const doc = await UpdateTracking.findOne({ guildID: interaction.guildId }) as any
	if (!doc || !doc.active) return interaction.reply({ content: "Update Mode isn't active here.", ephemeral: true })
	doc.active = false
	doc.changes = []
	await doc.save()
	setActiveLocal(interaction.guildId, false)
	return interaction.update({ content: `${config.successEmoji} Update Mode **cancelled** — tracked changes discarded.`, embeds: [], components: [backRow("ops_nav_mode", "Back to Update Mode")] })
}

async function replyConfigList(interaction: any) {
	const configs = await ServerConfig.find({}).lean() as any[]
	if (!configs.length) return interaction.reply({ content: "No servers configured yet. Use **Set Newsletter Channel**.", ephemeral: true })
	const lines = configs.map(c => `• **${c.guildName || c.guildID}** (\`${c.guildID}\`) → ${c.newsletterChannelID ? `<#${c.newsletterChannelID}>` : "_(no channel)_"}`)
	return interaction.reply({ content: `**Configured servers (${configs.length})**\n${lines.join("\n").slice(0, 1900)}`, ephemeral: true })
}
