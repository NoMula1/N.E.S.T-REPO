import mongoose from "mongoose"

export type GiveawayStatus = "active" | "ended" | "cancelled"

export interface Giveaway {
  guildId: string
  channelId: string
  messageId?: string
  hostId: string
  title: string
  description?: string
  endsAt: Date
  winnersCount: number
  requiredRoleId?: string | null
  entrants: string[]            // user IDs
  status: GiveawayStatus
  createdAt: Date
  updatedAt: Date
}

const schema = new mongoose.Schema<Giveaway>({
  guildId:       { type: String, required: true, index: true },
  channelId:     { type: String, required: true },
  messageId:     { type: String },
  hostId:        { type: String, required: true },
  title:         { type: String, required: true },
  description:   { type: String },
  endsAt:        { type: Date, required: true, index: true },
  winnersCount:  { type: Number, required: true, default: 1 },
  requiredRoleId:{ type: String, default: null },
  entrants:      { type: [String], default: [] },
  status:        { type: String, enum: ["active","ended","cancelled"], default: "active", index: true },
}, {
  timestamps: true,
  collection: "nest_giveaways",
})

schema.index({ guildId: 1, status: 1, endsAt: 1 })

export default mongoose.model<Giveaway>("Giveaway", schema)
