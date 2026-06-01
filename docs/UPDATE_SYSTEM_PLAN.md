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
- 🔜 **Phase 3 next** — Update Mode (event tracking: all/one/exclude → draft).

### How to author + send an update (Phase 2 usage)
1. `/ops action:"Set Newsletter Channel" server:<guildID> channel:<channelID>` for each target server.
2. Write the update as a `.md` file (## headings, `![alt](url)` banners, `---` dividers,
   `> thumb: url` for side images, `:emoji:` from the installed pack).
3. `/ops action:"Create Update" title:... [date] [version] [banner] file:<the .md>` → saves draft + previews.
4. `/ops action:"View Update" update:<pick>` to preview again.
5. `/ops action:"Send Update" update:<pick> scope:<All|All except|Specific> [server:<comma IDs>]`.

Relevant files:
- `src/commands/slash/staff/ManagerEmbeds.ts` — embeds hub + builders + TestEmbed.
- `src/commands/slash/staff/Ops.ts` — emoji installer.
- `src/events/help/DocsHubButtons.ts` — hub button/select interaction handler.
- `src/ai/` — existing NEST AI (handler.ts, dmHandler.ts) for Phase 4.
- Website `public/img/embeds/` — hosted banner/thumbnail PNGs.
