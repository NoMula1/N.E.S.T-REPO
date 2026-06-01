# NightHawk Update System — Master Plan & Memory

> Reference doc for the multi-phase build of the NightHawk Update System on the
> **N.E.S.T-REPO** Discord bot (`NoMula1/N.E.S.T-REPO`, branch `main`).
> If the conversation compacts, read this first to resume.

Owner / only authorized user for now: **`1149913737558499358`** (Tyler).
Companion website repo: `C:\Users\tyler\Downloads\NIGHTHAWKORG` (master) — used for
the web composer page + hosted banner images.

---

## What we're building

A modular, multi-server **Update / changelog system** for NightHawk + partner servers.
Two complementary authoring paths feed **one stored Update object**, all under `/ops`.

### `/ops` structure (owner-only)
> **Implemented as a no-option command → ephemeral button/menu/modal PANEL**
> (one picker row, no subcommands). The tree below is the conceptual layout;
> each node is a button or menu, not a slash subcommand.
```
/ops
 ├─ 📑 Manage Embeds        (the old /managerembeds, moved here)
 │    ├─ Doc Embeds         (docs from nighthawknetwork.org/docs/manifest.json)
 │    ├─ Feature Embeds     (portfolio, marketplace, scam-logs, careers, customize, badges, applications, mockup-maker, background-library)
 │    └─ Update Embeds      → select-menu of saved updates → View / Send / Edit / Delete
 ├─ 🛰️ Update Mode          → Start / Finish / Compose
 ├─ ⚙️ Configure Server     → per-server settings (newsletter channel by ID, etc.)
 └─ 😀 Install Emojis        (DONE — Ops.ts emojisinstall)
```

### Targeting (where an update sends) — mirrors the emoji command ergonomics
- **All servers**
- **All servers except** (exclude one/some)
- **Specific server** — by **picker** or by **server ID**

Content is **identical across servers by default** (treat the ecosystem as one server).
For a server that got something different → make an **individual update** just for it
(AI can tailor from notes). No per-server variable substitution — keep info general.

### Channel config
`/ops → Configure Server → <server ID> → Newsletter Channel ID → <channel ID>`.
Bot remembers the newsletter/changelog channel per server and posts there.

### Update identity
Saved + listed as `YYYY-MM-DD · Title · vX.Y` (date-first sort). e.g. `2026-06-01 · Portfolios · v2.0`.

### Storage (bot Mongo / Mongoose)
- `nh_updates` — saved updates (title, date, version, blocks/markdown, banner, status, createdBy, sentTo[]).
- `nh_server_config` — per-server settings (guildId, newsletterChannelId, …).
Every update kept forever, listable, re-sendable any time.

### Four authoring methods (ALL of them — listed in build order)
1. **Markdown file** → attach `.md`, parsed into Components V2. *(build FIRST — matches how Tyler already writes updates)*
2. **Update Mode** → tracked server changes + AI. *(second)*
3. **Web composer** → owner-only page on nighthawknetwork.org. *(third)*
4. **Modal paste** → quick small updates. *(fourth)*

All four produce the same saved Update object.

### Update Mode (the AI builder)
1. `Start` — choose tracking scope, same pattern as emojis: **all / one / all-except**.
   Types tracked: channels, roles, emojis, server settings, bots.
2. Tyler does server work; bot logs tracked changes (Discord gateway/audit events).
3. `Finish` — bot shows the tracked list.
4. Tyler adds off-Discord changes (website/bot features) by telling it.
5. **AI compose (optional toggle):** NEST AI (`src/ai/`) turns *tracked changes + notes +
   house style* into a polished update. **Summarize-only — NEVER invents features.**
6. Review/edit → save → send to targeted server(s).

Custom emoji (`:RDIcon:`, `:Automod:`, …) render from the pack installed via `/ops emojisinstall`.

### Access
**Owner only** (`1149913737558499358`) — create, send, configure, web composer.

---

## Build phases (each usable on its own)

- **Phase 1 — Foundation**
  - Extract Components V2 renderer + `:emoji:` resolver into a shared module
    (`src/utils/ComponentsV2.ts`), refactor `ManagerEmbeds.ts` to use it (no behavior change).
  - `nh_server_config` schema + `/ops` Configure-Server (set newsletter channel by ID).
  - Make Manage Embeds reachable from `/ops` (reuse the existing hub).
- **Phase 2 — Update Embeds (markdown file)**
  - `nh_updates` schema + markdown→Components V2 parser + list/view/**send with targeting**
    (all / exclude / specific by picker or ID).
- **Phase 3 — Update Mode (tracked, no AI)** — event tracking (all/one/exclude) → draft → save.
- **Phase 4 — AI compose** — route Update Mode through NEST's `src/ai/` (summarize-only).
- **Phase 5 — Web composer (owner-only site page) + Modal paste.**

---

## Key technical notes (don't relearn these)

- **discord.js 14.18.0** — Components V2 supported. Builders: `ContainerBuilder`,
  `SectionBuilder`, `MediaGalleryBuilder` + `MediaGalleryItemBuilder`, `ThumbnailBuilder`,
  `SeparatorBuilder`, `TextDisplayBuilder`. `ApplicationEmojiManager` available.
- **IsComponentsV2 flag = `1 << 15` (32768).** The top-level `discord-api-types` bundled
  with discord.js predates the enum, so use the **raw value** (`const FLAG_COMPONENTS_V2 = 1 << 15`),
  and `SeparatorSpacingSize` is NOT exported there — just call `.setDivider(true)` (default spacing).
  Sending a V2 message: `reply({ flags: FLAG_COMPONENTS_V2 as any, components: [...] as any })` —
  NO `content`/`embeds` allowed alongside.
- **Container preserves insertion order** across its typed add methods
  (`addMediaGalleryComponents` / `addSectionComponents` / `addSeparatorComponents` /
  `addTextDisplayComponents`) — each pushes to one shared array. So build a flat ordered
  list and dispatch each item to the matching method in sequence.
- **No accent stripe** on the container to match the clean "dark card" look
  (`new ContainerBuilder()` with NO `setAccentColor`).
- **Section** needs 1–3 text displays + an accessory (`setThumbnailAccessory` / `setButtonAccessory`).
- Component cap ~40 incl. nested; text cap ~4000 chars total per message. Keep updates chunked.
- **Custom emoji**: the bot can use guild emojis from any guild it's in, OR application emojis
  (cap 2000). Application emojis are cleanest. Resolver should map `:name:` →
  `<:name:id>` / `<a:name:id>` from `client.application.emojis` + `client.emojis.cache`,
  leaving unknown `:name:` untouched.
- **Owner lock pattern** (see `Ops.ts`): explicit `interaction.user.id !== OWNER_ID` check at
  top of executor + `IsUser: [OWNER_ID]` on base permission. Don't rely on the dev-list/admin bypass.
- **CommandExecutor** framework: `.setName/.setDescription/.addStringOption/.addChoices/
  .setAutocomplete/.setAutocompleteExecutor/.setBasePermission/.setExecutor`. Commands auto-load
  by glob from `src/commands/slash/**`. Events auto-load from `src/events/**` (default export with
  `name: Events.X` + `execute`). Build = `tsc` → `dist/`, run from repo root → resolve assets via
  `process.cwd()`.
- **Components values caps**: autocomplete value ≤100 chars; select option label ≤100, description ≤100;
  ≤25 options per select / ≤25 autocomplete choices; ≤5 buttons per action row, ≤5 rows.

---

## Status log
- ✅ `/managerembeds` — 5-category hub + docs(live manifest)/feature embeds + TestEmbed (NightHawk
  onboarding, Components V2, container, hosted banners at `nighthawknetwork.org/img/embeds/`).
- ✅ `/ops action:emojisinstall` — owner-only bulk emoji installer; target Server|Application;
  category + multi-exclude (comma autocomplete); skips existing; **re-run continues** (filters
  already-installed before batching); 1.2s pacing; 200/run cap; bundled pack `assets/emojis/` (263).
- ✅ **Phase 1 DONE** — `src/utils/ComponentsV2.ts` (builders + emoji resolver),
  `src/schemas/ServerConfig.ts` (nh_server_config), `/ops` actions `embeds` +
  `config-newsletter`. ManagerEmbeds refactored onto the shared module.
- ✅ **Phase 2 DONE** — `src/schemas/Update.ts` (nh_updates), markdown→V2 parser
  (`parseMarkdownToV2`) + `renderUpdateComponents` in ComponentsV2, and `/ops`
  Update actions: `update-create` (.md attachment + title/date/version/banner),
  `update-view` (preview), `update-send` (scope all / all-except / specific via
  `server` comma-IDs, posts to each server's configured newsletter channel,
  logs sentTo), `update-list`, `update-delete`. `update` option autocompletes
  from saved updates. Added `addAttachmentOption` wrapper to CommandExecutor.
- ✅ **Phase 3 DONE** — Update Mode tracking. `src/schemas/UpdateTracking.ts`
  (nh_update_tracking), `src/utils/updateMode.ts` (in-memory ACTIVE set +
  recordChange + draftMarkdownFromChanges), `src/events/updatemode/Tracker.ts`
  (on* handlers for channels/roles/emojis/settings/bots + onReady→refreshActive).
  Added `GuildExpressions` intent to Core.ts (emoji events). `/ops` track
  subcommands: `track_start` (scope all/one/all-except + `types` autocomplete),
  `track_status`, `track_finish` (→ auto-draft Update + preview), `track_cancel`.
  Subcommand refactor of /ops also shipped (each subcommand shows only its own
  options) + "Update Embeds" button folded into the Manage Embeds hub.
- ✅ **/ops HUB REFACTOR** — Tyler wanted "it all under ONE command" (one
  picker row, no subcommand clutter, no R.I.O.T/DevSec `/ops` confusion).
  Discord always explodes subcommands into separate picker rows, so the
  only way to get one row is **no options at all**: `/ops` now opens an
  ephemeral owner-only **control panel** (buttons + menus + modals). Each
  action collects ONLY its own inputs when clicked, so nothing clutters
  anything else. New files: `src/utils/opsEmoji.ts` (pack reader +
  `installEmojiPack` runner, moved out of Ops.ts), `src/utils/opsHub.ts`
  (panel builders, modals, customId scheme — all `ops_*`), and
  `src/events/ops/OpsHub.ts` (InteractionCreate router for `ops_*`).
  `Ops.ts` is now a thin no-option command that replies with the root
  panel. Markdown authoring kept BOTH ways: paste into the Create modal
  (≤4000 chars) OR leave it blank and upload a `.md` file (message
  collector; MessageContent intent is on). Modal-paste folds in the old
  "Phase 5 modal paste" method early. tsc clean.
- 🔜 **Phase 4 next** — AI compose: route a saved draft through `src/ai/`
  so it polishes tracked changes + Tyler's off-Discord notes
  (summarize-only, never invent). Surface as an **"AI Compose"** button in
  the Updates panel (pick a draft → modal for notes → one-step-undo
  backup → preview). Then Phase 5 (web composer; modal paste already done).

### Panel navigation (current — everything via `/ops`)
Run `/ops` → ephemeral control panel. Buttons:
- **Manage Embeds** → the docs/feature/update-embed hub (unchanged).
- **Updates** → Create · List · View · Send · Delete.
- **Update Mode** → Start (all) · types-menu (specific) · Status · Finish · Cancel.
- **Configure** → Set Newsletter Channel (modal) · List Configured.
- **Install Emojis** → This Server / Bot App (modal asks category + exclude).

### Update Mode usage (panel)
1. `/ops` → **Update Mode** → **Start (all)**, or pick specific types in the menu.
2. Do your server changes (bot logs channels/roles/emojis/settings/bots).
3. **Status** to see what's logged.
4. **Finish** → saves a draft Update from the changes + previews it.
   Edit it / add off-Discord notes, then **Updates → Send**. **Cancel** discards.

### How to author + send an update (panel)
1. `/ops` → **Configure** → **Set Newsletter Channel** (server ID blank = current; channel ID) per target server.
2. `/ops` → **Updates** → **Create** → modal: title/date/version/banner, then either
   **paste markdown** into the box (≤4000 chars) OR leave it blank and **upload a `.md` file**
   when prompted. Markdown supports `##` headings, `![alt](url)` banners, `---` dividers,
   `> thumb: url` side images, `:emoji:` from the installed pack. Saves draft + previews.
3. **Updates → View** → pick to preview again.
4. **Updates → Send** → pick the update → **All / All-except / Specific** → (pick servers) → broadcast.

Relevant files:
- `src/commands/slash/staff/ManagerEmbeds.ts` — embeds hub + builders + TestEmbed.
- `src/commands/slash/staff/Ops.ts` — emoji installer.
- `src/events/help/DocsHubButtons.ts` — hub button/select interaction handler.
- `src/ai/` — existing NEST AI (handler.ts, dmHandler.ts) for Phase 4.
- Website `public/img/embeds/` — hosted banner/thumbnail PNGs.
