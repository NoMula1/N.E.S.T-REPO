import mongoose from "mongoose"

/** NEST-wide singleton settings, stored in the shared NEST database
 *  (collection nest_system_config) so the website (via NEST_MONGO_URI)
 *  and this bot both read the same document. Identified by key='config'.
 *  Currently holds the AI-portal server allowlist — the Discord guild IDs
 *  permitted to use the NightHawk AI portal. */
export interface NestSystemConfig {
  key: string
  aiPortalGuildIds: string[]
  updatedAt?: Date
}

const schema = new mongoose.Schema<NestSystemConfig>({
  key: { type: String, required: true, unique: true, default: 'config' },
  aiPortalGuildIds: { type: [String], default: [] },
  updatedAt: Date,
}, { collection: 'nest_system_config' })

export default mongoose.model<NestSystemConfig>('NestSystemConfig', schema)
