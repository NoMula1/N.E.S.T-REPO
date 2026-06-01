/* ──────────────────────────────────────────────────────────────────
   UpdateTracking (nh_update_tracking) — one document per guild that is
   currently (or was last) in "Update Mode". The bot logs server changes
   here while tracking is active, and Finish turns them into a draft
   update.
   ────────────────────────────────────────────────────────────────── */
import mongoose, { Schema } from "mongoose"

export interface TrackedChange {
	type: string;     // channels | roles | emojis | settings | bots
	action: string;   // created | deleted | renamed | updated | added
	name: string;
	detail: string;
	at: Date;
}

export interface UpdateTracking {
	guildID: string;
	active: boolean;
	scope: "all" | "one" | "all-except";
	types: string[];       // resolved set of types being tracked
	startedAt?: Date;
	startedBy: string;
	changes: TrackedChange[];
}

const changeSchema = new Schema<TrackedChange>({
	type:   String,
	action: String,
	name:   String,
	detail: { type: String, default: "" },
	at:     { type: Date, default: Date.now },
}, { _id: false })

const schema = new Schema<UpdateTracking>({
	guildID:   { type: String, required: true, unique: true, index: true },
	active:    { type: Boolean, default: false, index: true },
	scope:     { type: String, enum: ["all", "one", "all-except"], default: "all" },
	types:     { type: [String], default: [] },
	startedAt: { type: Date },
	startedBy: { type: String, default: "" },
	changes:   { type: [changeSchema], default: [] },
}, { timestamps: true })

export default mongoose.models.nh_update_tracking
	|| mongoose.model<UpdateTracking>("nh_update_tracking", schema)
