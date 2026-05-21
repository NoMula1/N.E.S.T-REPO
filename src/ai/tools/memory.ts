/* ============================================================
   NightHawk AI — Memory tools.
   Lets the AI persist notes across sessions so things like
   "remember my shopping list" actually survive a session timeout
   or bot restart.

   Scopes:
   - 'user'    : private — only this Discord user gets the memory back
   - 'channel' : channel-scoped (require guild context to set)
   - 'server'  : guild-wide (admin-only writes)

   The bot also auto-injects relevant memories into the system prompt
   on session start; the tools are for create/update/delete/search.
============================================================ */
import type { Guild, GuildMember, Message } from "discord.js"
import Memory from "../../schemas/Memory"
import type { MemoryScope } from "../../schemas/Memory"

interface ExecCtx {
	guild: Guild
	message: Message
	actor: GuildMember
}

type Tool = {
	name: string
	description: string
	input_schema: Record<string, unknown>
}

export const MEMORY_TOOL_DEFINITIONS: Tool[] = [
	{
		name: "save_memory",
		description: "Persist a memory the AI can recall in future conversations — even after this session ends or the bot restarts. THIS IS HOW YOU REMEMBER THINGS. When the user says 'remember X' or 'keep this in memory', call this tool. Pick the right scope: 'user' for personal notes (shopping list, prefs), 'channel' for channel-local context, 'server' for guild-wide. The key should be a short slug like 'shopping-list' or 'marketplace-policy'.",
		input_schema: {
			type: "object",
			properties: {
				scope:   { type: "string", enum: ["user", "channel", "server"], description: "Who should this memory belong to." },
				key:     { type: "string", description: "Short slug identifying this memory, e.g. 'shopping-list', 'prefs', 'partner-servers'. If you save with an existing key, the previous content is replaced." },
				content: { type: "string", description: "The note text (up to 4000 chars)." },
				tags:    { type: "array", items: { type: "string" }, description: "Optional tags for grouping (e.g. ['lists','personal']). Max 8." },
			},
			required: ["scope", "key", "content"],
		},
	},
	{
		name: "recall_memory",
		description: "Look up saved memories. Use when the user asks something that might be in memory ('what's on my shopping list?', 'what was that policy we set?'). Without args, returns the user's own + accessible memories. Use `key` to fetch a specific one, or `query` for a substring search.",
		input_schema: {
			type: "object",
			properties: {
				scope: { type: "string", enum: ["user", "channel", "server"], description: "Optional scope filter." },
				key:   { type: "string", description: "Optional exact key to fetch." },
				query: { type: "string", description: "Optional substring to search within content + tags." },
			},
		},
	},
	{
		name: "forget_memory",
		description: "Permanently delete a memory. Use when the user says 'forget X' or 'delete that note'. User-scope memories can only be deleted by their owner; server-scope by admins.",
		input_schema: {
			type: "object",
			properties: {
				scope: { type: "string", enum: ["user", "channel", "server"] },
				key:   { type: "string" },
			},
			required: ["scope", "key"],
		},
	},
	{
		name: "list_memories",
		description: "Show all saved memories the requesting user can see. Use for 'what do you remember about me' or 'show my notes'. Returns key, scope, content preview, last-used timestamp.",
		input_schema: {
			type: "object",
			properties: {
				scope: { type: "string", enum: ["user", "channel", "server"], description: "Optional scope filter." },
			},
		},
	},
]

/* ── Helpers ─────────────────────────────── */
function normalizeKey(k: unknown): string | null {
	if (typeof k !== "string") return null
	const cleaned = k.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60)
	return cleaned || null
}

function subjectFor(scope: MemoryScope, ctx: ExecCtx): string {
	if (scope === "user")    return ctx.actor.id
	if (scope === "channel") return ctx.message.channelId
	return ctx.guild.id // 'server'
}

async function canWriteScope(scope: MemoryScope, ctx: ExecCtx): Promise<boolean> {
	if (scope === "user") return true     // anyone can write their own
	if (scope === "channel") return true  // anyone in the channel can pin context for the channel
	// 'server' — admins/manageGuild only
	const perms = ctx.actor.permissions
	return perms.has("Administrator") || perms.has("ManageGuild")
}

function fmtMemory(m: any): string {
	const ts = m.updatedAt ? new Date(m.updatedAt).toISOString().slice(0, 16).replace("T", " ") : "?"
	const tags = (m.tags && m.tags.length) ? ` [${m.tags.join(", ")}]` : ""
	const preview = (m.content || "").slice(0, 200) + ((m.content || "").length > 200 ? "…" : "")
	return `• [${m.scope}/${m.key}]${tags} · updated ${ts}\n  ${preview}`
}

/* ── Inline recall used by handler.ts to inject memories ──
   into the system prompt on session start. Pulls user-scope
   memories for the user plus channel + server scope memories
   for the current context, all in one query. */
export async function loadRelevantMemories(
	guildId: string,
	channelId: string | null,
	userId: string,
	limit = 40,
): Promise<Array<{ scope: MemoryScope; key: string; content: string; tags: string[] }>> {
	const orParts: Array<Record<string, unknown>> = [
		{ scope: "user",   subjectId: userId },
		{ scope: "server", subjectId: guildId },
	]
	if (channelId) orParts.push({ scope: "channel", subjectId: channelId })

	const docs = await Memory.find({
		guildId,
		$or: orParts,
	}).sort({ updatedAt: -1 }).limit(limit).lean()

	return docs.map(d => ({ scope: d.scope, key: d.key, content: d.content, tags: d.tags || [] }))
}

/* ── Executor ────────────────────────────── */
export async function executeMemoryTool(
	name: string,
	input: Record<string, unknown>,
	ctx: ExecCtx,
): Promise<string> {
	const { guild, actor } = ctx

	switch (name) {
		case "save_memory": {
			const scope = input.scope as MemoryScope
			const key = normalizeKey(input.key)
			const content = (input.content as string | undefined)?.toString().slice(0, 4000)
			const tagsIn = Array.isArray(input.tags) ? input.tags : []
			const tags = tagsIn.filter(t => typeof t === "string").map(t => (t as string).trim().toLowerCase()).filter(Boolean).slice(0, 8)

			if (!scope || !["user", "channel", "server"].includes(scope)) return "Error: scope must be 'user', 'channel', or 'server'."
			if (!key) return "Error: key required (short slug, e.g. 'shopping-list')."
			if (!content) return "Error: content required."

			if (!(await canWriteScope(scope, ctx))) return `Error: only admins/server-managers can write server-scope memories.`
			const subjectId = subjectFor(scope, ctx)

			const doc = await Memory.findOneAndUpdate(
				{ guildId: guild.id, scope, subjectId, key },
				{ $set: { content, tags, createdBy: actor.id }, $setOnInsert: { useCount: 0 } },
				{ upsert: true, new: true },
			).lean()
			return `Saved memory \`${scope}/${key}\` (${(content || "").length} chars).`
		}

		case "recall_memory": {
			const scope = input.scope as MemoryScope | undefined
			const key = typeof input.key === "string" ? normalizeKey(input.key) : null
			const query = typeof input.query === "string" ? input.query.trim() : ""

			const filter: Record<string, unknown> = { guildId: guild.id }
			if (scope) {
				filter.scope = scope
				filter.subjectId = subjectFor(scope, ctx)
			} else {
				// Default: everything the user can see
				filter.$or = [
					{ scope: "user",   subjectId: actor.id },
					{ scope: "channel", subjectId: ctx.message.channelId },
					{ scope: "server", subjectId: guild.id },
				]
			}
			if (key) filter.key = key
			if (query) {
				const rx = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
				filter.$and = [{ $or: [{ content: rx }, { tags: rx }, { key: rx }] }]
			}

			const docs = await Memory.find(filter).sort({ updatedAt: -1 }).limit(20).lean()
			if (docs.length === 0) return "No matching memories."

			// Bump use stats async (don't block reply)
			const ids = docs.map(d => d._id)
			Memory.updateMany({ _id: { $in: ids } }, { $inc: { useCount: 1 }, $set: { lastUsedAt: new Date() } }).catch(() => {})

			return `Found ${docs.length} memor${docs.length === 1 ? "y" : "ies"}:\n${docs.map(fmtMemory).join("\n\n")}`
		}

		case "forget_memory": {
			const scope = input.scope as MemoryScope
			const key = normalizeKey(input.key)
			if (!scope || !key) return "Error: both scope and key are required."

			if (!(await canWriteScope(scope, ctx))) return "Error: insufficient permissions to delete this memory."
			const subjectId = subjectFor(scope, ctx)

			const deleted = await Memory.findOneAndDelete({
				guildId: guild.id, scope, subjectId, key,
			}).lean()
			if (!deleted) return `No memory \`${scope}/${key}\` to delete.`
			return `Forgot memory \`${scope}/${key}\`.`
		}

		case "list_memories": {
			const scope = input.scope as MemoryScope | undefined
			const filter: Record<string, unknown> = { guildId: guild.id }
			if (scope) {
				filter.scope = scope
				filter.subjectId = subjectFor(scope, ctx)
			} else {
				filter.$or = [
					{ scope: "user",   subjectId: actor.id },
					{ scope: "channel", subjectId: ctx.message.channelId },
					{ scope: "server", subjectId: guild.id },
				]
			}
			const docs = await Memory.find(filter).sort({ scope: 1, updatedAt: -1 }).limit(50).lean()
			if (docs.length === 0) return "No saved memories."
			return `Saved memories (${docs.length}):\n${docs.map(fmtMemory).join("\n\n")}`
		}
	}
	return `Error: unknown memory tool '${name}'`
}
