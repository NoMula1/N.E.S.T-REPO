/* ──────────────────────────────────────────────────────────────────
   Update (nh_updates) — saved, dated, re-sendable update / changelog
   posts for the NightHawk Update System.

   The `markdown` field is the source of truth; it's parsed into
   Components V2 on view/send (see utils/ComponentsV2 renderUpdateComponents).
   `sentTo` logs every place an update was posted so we have a history.
   ────────────────────────────────────────────────────────────────── */
import mongoose, { Schema } from "mongoose"

export interface SentRecord {
	guildID: string;
	channelID: string;
	messageID: string;
	sentAt: Date;
}

export interface Update {
	updateId: string;      // stable short id, e.g. "2026-06-01-portfolios"
	title: string;
	date: string;          // YYYY-MM-DD (string so it displays + sorts as authored)
	version: string;       // e.g. "2.0" (optional, "" if none)
	banner: string;        // optional hero banner URL
	markdown: string;      // authored source
	createdBy: string;     // owner ID
	status: "draft" | "published";
	sentTo: SentRecord[];
	createdAt?: Date;
	updatedAt?: Date;
}

const sentSchema = new Schema<SentRecord>({
	guildID:   String,
	channelID: String,
	messageID: String,
	sentAt:    { type: Date, default: Date.now },
}, { _id: false })

const schema = new Schema<Update>({
	updateId:  { type: String, required: true, unique: true, index: true },
	title:     { type: String, required: true },
	date:      { type: String, required: true, index: true },
	version:   { type: String, default: "" },
	banner:    { type: String, default: "" },
	markdown:  { type: String, default: "" },
	createdBy: { type: String, default: "" },
	status:    { type: String, enum: ["draft", "published"], default: "draft" },
	sentTo:    { type: [sentSchema], default: [] },
}, { timestamps: true })

// Newest first for listing.
schema.index({ date: -1, createdAt: -1 })

export default mongoose.models.nh_updates
	|| mongoose.model<Update>("nh_updates", schema)
