/* ──────────────────────────────────────────────────────────────────
   opsHub — UI builders for the single `/ops` control panel.

   `/ops` takes NO options. Running it opens this owner-only panel; every
   action collects ONLY its own inputs when clicked (via modals + menus),
   so nothing from one action ever clutters another. One picker row, no
   subcommands.

   customId scheme (all prefixed `ops_` so the event router can claim them
   without colliding with the `me_` Manage-Embeds handler):
     ops_nav_root|updates|mode|config|emojis|embeds   panel navigation
     ops_upd_create|list|view|send|delete             Updates actions
     ops_view_pick / ops_del_pick / ops_send_pick      update select menus
     ops_del_confirm_<id>                              delete confirm
     ops_send_all_<id> / _except_<id> / _specific_<id> send scope
     ops_sendsrv_except_<id> / _specific_<id>          server multi-select
     ops_mode_startall|status|finish|cancel            Update Mode actions
     ops_mode_types                                    track specific types
     ops_cfg_news|list                                 Configure actions
     ops_emoji_install_server|application              Install Emojis
     ops_modal_create|news|emoji_server|emoji_application  modal submits
   ────────────────────────────────────────────────────────────────── */
import {
	ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder,
	ModalBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
	TextInputBuilder, TextInputStyle,
} from "discord.js"
import { TRACK_TYPES } from "./updateMode"

export const OWNER_ID = "1149913737558499358"
const NH_RED = 0xE63946

export const SNOWFLAKE = /^\d{17,20}$/
export const todayISO = () => new Date().toISOString().slice(0, 10)
export const slugify = (s: string) =>
	s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "update"
/** Parse a comma list of server IDs, keeping only valid snowflakes. */
export const parseIds = (s: string | null) =>
	(s || "").split(",").map(x => x.trim()).filter(x => SNOWFLAKE.test(x))

const btn = (id: string, label: string, emoji: string, style = ButtonStyle.Secondary) =>
	new ButtonBuilder().setCustomId(id).setLabel(label).setEmoji(emoji).setStyle(style)

const backBtn = (to = "ops_nav_root", label = "Back") =>
	new ButtonBuilder().setCustomId(to).setLabel(label).setEmoji("⬅️").setStyle(ButtonStyle.Secondary)

/** A standalone action row with just a Back button (for intermediate screens). */
export const backRow = (to = "ops_nav_root", label = "Back") =>
	new ActionRowBuilder<ButtonBuilder>().addComponents(backBtn(to, label))

type Panel = { embed: EmbedBuilder; rows: ActionRowBuilder<any>[] }

const panelEmbed = (title: string, desc: string) =>
	new EmbedBuilder().setColor(NH_RED).setTitle(title).setDescription(desc)
		.setFooter({ text: "NightHawk · /ops control panel" })

/* ─── Root panel ─── */
export function buildRootPanel(): Panel {
	const embed = panelEmbed(
		"🛰️  NightHawk Ops",
		"Owner control panel — only **you** see this. Pick a section:\n\n" +
		"📰 **Updates** — create, preview, send & manage changelog posts\n" +
		"🛰️ **Update Mode** — track this server's changes into a draft\n" +
		"⚙️ **Configure** — set each server's newsletter channel\n" +
		"😀 **Install Emojis** — load the bundled emoji pack\n\n" +
		"_Posting docs / feature / ToS embeds lives in its own command:_ `/managerembeds`.",
	)
	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
		btn("ops_nav_updates", "Updates", "📰", ButtonStyle.Primary),
		btn("ops_nav_mode", "Update Mode", "🛰️", ButtonStyle.Primary),
		btn("ops_nav_config", "Configure", "⚙️"),
		btn("ops_nav_emojis", "Install Emojis", "😀"),
	)
	return { embed, rows: [row] }
}

/* ─── Updates panel ─── */
export function buildUpdatesPanel(): Panel {
	const embed = panelEmbed(
		"📰  Updates",
		"Create, preview, send and manage your changelog / newsletter posts.\n\n" +
		"• **Create** — from pasted markdown or an uploaded `.md` file\n" +
		"• **List** — every saved update\n" +
		"• **View** — preview one without sending\n" +
		"• **Send** — broadcast to All / All-except / Specific servers\n" +
		"• **Delete** — remove a saved update",
	)
	const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
		btn("ops_upd_create", "Create", "📝", ButtonStyle.Success),
		btn("ops_upd_list", "List", "📋"),
		btn("ops_upd_view", "View", "👁️"),
		btn("ops_upd_send", "Send", "📤", ButtonStyle.Primary),
		btn("ops_upd_delete", "Delete", "🗑️", ButtonStyle.Danger),
	)
	const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(backBtn())
	return { embed, rows: [row1, row2] }
}

/* ─── Update Mode panel ─── */
export function buildModePanel(): Panel {
	const embed = panelEmbed(
		"🛰️  Update Mode",
		"Track this server's changes (channels, roles, emojis, settings, bots) into a draft update.\n\n" +
		"• **Start (all)** — track everything\n" +
		"• or pick specific types in the menu below to track just those\n" +
		"• **Status** — what's been logged so far\n" +
		"• **Finish** — stop & turn changes into a draft\n" +
		"• **Cancel** — stop & discard",
	)
	const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
		btn("ops_mode_startall", "Start (all)", "▶️", ButtonStyle.Success),
		btn("ops_mode_status", "Status", "📊"),
		btn("ops_mode_finish", "Finish", "✅", ButtonStyle.Primary),
		btn("ops_mode_cancel", "Cancel", "✖️", ButtonStyle.Danger),
		backBtn(),
	)
	const typeSelect = new StringSelectMenuBuilder()
		.setCustomId("ops_mode_types")
		.setPlaceholder("Or start tracking only specific types…")
		.setMinValues(1)
		.setMaxValues(TRACK_TYPES.length)
		.addOptions(TRACK_TYPES.map(t =>
			new StringSelectMenuOptionBuilder().setLabel(cap(t)).setValue(t)))
	const row2 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(typeSelect)
	return { embed, rows: [row1, row2] }
}

/* ─── Configure panel ─── */
export function buildConfigPanel(): Panel {
	const embed = panelEmbed(
		"⚙️  Configure",
		"Set where each server receives updates. The bot posts updates to that server's **newsletter / changelog channel**.",
	)
	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
		btn("ops_cfg_news", "Set Newsletter Channel", "📮", ButtonStyle.Primary),
		btn("ops_cfg_list", "List Configured", "📋"),
		backBtn(),
	)
	return { embed, rows: [row] }
}

/* ─── Install Emojis panel ─── */
export function buildEmojiPanel(): Panel {
	const embed = panelEmbed(
		"😀  Install Emojis",
		"Install the bundled emoji pack.\n\n" +
		"• **This Server** — emojis members can use (Discord-capped; install per-category)\n" +
		"• **Bot Application** — up to 2000 the bot renders in its own embeds\n\n" +
		"You'll be asked for an optional **category** (blank = all) and **exclusions**. " +
		"Re-running continues where it left off.",
	)
	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
		btn("ops_emoji_install_server", "Install to This Server", "🏠", ButtonStyle.Primary),
		btn("ops_emoji_install_application", "Install to Bot App", "🤖", ButtonStyle.Primary),
		backBtn(),
	)
	return { embed, rows: [row] }
}

/* ─── Reusable menus ─── */
export function updateSelectRow(docs: any[], customId: string, placeholder: string) {
	const menu = new StringSelectMenuBuilder()
		.setCustomId(customId)
		.setPlaceholder(placeholder)
		.addOptions(docs.slice(0, 25).map(u =>
			new StringSelectMenuOptionBuilder()
				.setLabel(`${u.date} · ${u.title}`.slice(0, 100))
				.setDescription(`${u.version ? `v${u.version} · ` : ""}${u.status}${u.sentTo?.length ? ` · sent ${u.sentTo.length}×` : ""}`.slice(0, 100))
				.setValue(u.updateId)))
	return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)
}

export function serverSelectRow(configs: any[], customId: string, placeholder: string) {
	const opts = configs.slice(0, 25).map(c =>
		new StringSelectMenuOptionBuilder()
			.setLabel((c.guildName || c.guildID).slice(0, 100))
			.setDescription(`${c.guildID}`.slice(0, 100))
			.setValue(c.guildID))
	const menu = new StringSelectMenuBuilder()
		.setCustomId(customId)
		.setPlaceholder(placeholder)
		.setMinValues(1)
		.setMaxValues(Math.max(1, opts.length))
		.addOptions(opts)
	return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)
}

export function scopeRows(updateId: string, title: string) {
	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder().setCustomId(`ops_send_all_${updateId}`).setLabel("All servers").setEmoji("🌐").setStyle(ButtonStyle.Primary),
		new ButtonBuilder().setCustomId(`ops_send_except_${updateId}`).setLabel("All except…").setEmoji("➖").setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId(`ops_send_specific_${updateId}`).setLabel("Specific…").setEmoji("🎯").setStyle(ButtonStyle.Secondary),
	)
	const back = new ActionRowBuilder<ButtonBuilder>().addComponents(backBtn("ops_nav_updates", "Back"))
	return { content: `Send **${title}** — choose targets:`, rows: [row, back] }
}

export function deleteConfirmRow(updateId: string) {
	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder().setCustomId(`ops_del_confirm_${updateId}`).setLabel("Delete permanently").setEmoji("🗑️").setStyle(ButtonStyle.Danger),
		backBtn("ops_nav_updates", "Cancel"),
	)
}

/* ─── Modals ─── */
export function createUpdateModal(): ModalBuilder {
	const m = new ModalBuilder().setCustomId("ops_modal_create").setTitle("Create Update")
	const ti = (id: string, label: string, style: TextInputStyle, required: boolean, placeholder?: string, max?: number) => {
		const t = new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setRequired(required)
		if (placeholder) t.setPlaceholder(placeholder)
		if (max) t.setMaxLength(max)
		return new ActionRowBuilder<TextInputBuilder>().addComponents(t)
	}
	m.addComponents(
		ti("title", "Title", TextInputStyle.Short, true, "e.g. Portfolios v2", 200),
		ti("date", "Date (YYYY-MM-DD)", TextInputStyle.Short, false, "blank = today", 10),
		ti("version", "Version", TextInputStyle.Short, false, "e.g. 2.0", 30),
		ti("banner", "Banner image URL", TextInputStyle.Short, false, "optional hero image", 500),
		ti("markdown", "Markdown body", TextInputStyle.Paragraph, false, "Paste markdown here — or leave blank to upload a .md file next", 4000),
	)
	return m
}

export function newsletterModal(): ModalBuilder {
	const m = new ModalBuilder().setCustomId("ops_modal_news").setTitle("Set Newsletter Channel")
	const server = new TextInputBuilder().setCustomId("server").setLabel("Server ID").setStyle(TextInputStyle.Short)
		.setRequired(false).setPlaceholder("blank = this server").setMaxLength(20)
	const channel = new TextInputBuilder().setCustomId("channel").setLabel("Channel ID").setStyle(TextInputStyle.Short)
		.setRequired(true).setPlaceholder("the newsletter / changelog channel ID").setMaxLength(20)
	m.addComponents(
		new ActionRowBuilder<TextInputBuilder>().addComponents(server),
		new ActionRowBuilder<TextInputBuilder>().addComponents(channel),
	)
	return m
}

export function emojiModal(target: "server" | "application"): ModalBuilder {
	const m = new ModalBuilder().setCustomId(`ops_modal_emoji_${target}`)
		.setTitle(target === "application" ? "Install → Bot App" : "Install → This Server")
	const category = new TextInputBuilder().setCustomId("category").setLabel("Category").setStyle(TextInputStyle.Short)
		.setRequired(false).setPlaceholder("blank = all categories").setMaxLength(60)
	const exclude = new TextInputBuilder().setCustomId("exclude").setLabel("Exclude categories").setStyle(TextInputStyle.Short)
		.setRequired(false).setPlaceholder("comma-separated, e.g. Ranks, Badges").setMaxLength(200)
	m.addComponents(
		new ActionRowBuilder<TextInputBuilder>().addComponents(category),
		new ActionRowBuilder<TextInputBuilder>().addComponents(exclude),
	)
	return m
}

function cap(s: string): string { return s ? s[0].toUpperCase() + s.slice(1) : s }
