/* ──────────────────────────────────────────────────────────────────
   ServerConfig (nh_server_config) — per-server settings for the
   NightHawk Update System. One document per guild the bot operates in.

   Set via /ops → Set Newsletter Channel. Read when sending an update so
   the bot knows where to post in each target server.
   ────────────────────────────────────────────────────────────────── */
import mongoose, { Schema } from "mongoose"

export interface ServerConfig {
	guildID: string;
	/** Channel ID where update / changelog posts are sent. */
	newsletterChannelID: string;
	/** Friendly name cached for the targeting UI (optional). */
	guildName?: string;
	updatedAt?: Date;
}

const schema = new Schema<ServerConfig>({
	guildID:             { type: String, required: true, unique: true, index: true },
	newsletterChannelID: { type: String, default: "" },
	guildName:           { type: String, default: "" },
	updatedAt:           { type: Date, default: Date.now },
})

export default mongoose.models.nh_server_config
	|| mongoose.model<ServerConfig>("nh_server_config", schema)
