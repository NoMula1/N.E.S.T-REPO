/* ============================================================
   Memory — persistent notes the AI can recall across sessions.

   Scope hierarchy:
   - 'user'    : private to one Discord user (subjectId = userId).
                 Example: shopping list, preferred tone, personal facts.
   - 'channel' : visible to anyone using the AI in that channel
                 (subjectId = channelId). Example: channel-specific rules.
   - 'server'  : visible across the whole guild (subjectId = guildId).
                 Example: marketplace policy, ongoing investigations.

   On session start, relevant memories for the (user, channel, guild)
   are injected into the AI's system prompt so it has context without
   needing to call tools first.

   The AI also has tools to create/update/delete memories on demand.
============================================================ */
import mongoose from "mongoose"

export type MemoryScope = "user" | "channel" | "server"

export interface Memory {
	guildId: string        // hub guildId for DM-created memories
	scope: MemoryScope
	subjectId: string      // userId / channelId / guildId depending on scope
	key: string            // short slug, unique within (guildId, scope, subjectId)
	content: string        // the note itself
	tags: string[]         // optional tags for filtering / grouping
	createdBy: string      // userId who created (or last updated) it
	useCount: number       // incremented each time the AI references it
	lastUsedAt: Date | null
	createdAt: Date
	updatedAt: Date
}

const schema = new mongoose.Schema<Memory>({
	guildId:    { type: String, required: true, index: true },
	scope:      { type: String, enum: ["user", "channel", "server"], required: true, index: true },
	subjectId:  { type: String, required: true, index: true },
	key:        { type: String, required: true },
	content:    { type: String, required: true, maxlength: 4000 },
	tags:       { type: [String], default: [] },
	createdBy:  { type: String, required: true },
	useCount:   { type: Number, default: 0 },
	lastUsedAt: { type: Date,   default: null },
}, {
	timestamps: true,
	collection: "nest_memories",
})

// Enforce uniqueness of (guildId, scope, subjectId, key)
schema.index({ guildId: 1, scope: 1, subjectId: 1, key: 1 }, { unique: true })
// Per-user lookup path
schema.index({ guildId: 1, scope: 1, subjectId: 1 })

export default mongoose.model<Memory>("Memory", schema)
