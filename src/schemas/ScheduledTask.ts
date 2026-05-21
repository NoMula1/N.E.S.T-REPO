/* ============================================================
   ScheduledTask — AI-driven scheduling & reminders.

   The AI uses tools (schedule_reminder, schedule_announcement, etc.)
   to create rows here. A background worker polls for
   nextRunAt <= now, executes the payload (DM or channel post),
   and bumps nextRunAt for recurring tasks.

   Stored in nest_scheduled_tasks (same DB the website reads).
============================================================ */
import mongoose from "mongoose"

export type ScheduleType =
	| "dm_reminder"        // DM the creator (and optionally a mention target)
	| "channel_message"    // post plain text to a channel
	| "channel_embed"      // post an embed to a channel

export type ScheduleKind = "once" | "cron"
export type ScheduleStatus = "active" | "paused" | "fired" | "cancelled" | "errored"

export interface ScheduledEmbedPayload {
	title?: string
	description?: string
	color?: number
	footer?: string
	url?: string
	thumbnail?: string
	image?: string
}

export interface ScheduledTask {
	guildId: string             // indexed
	createdBy: string           // userId of whoever asked the AI to schedule
	type: ScheduleType
	scheduleKind: ScheduleKind
	whenIso?: Date              // for kind='once'
	cron?: string               // 5-field cron (kind='cron')
	tz: string                  // IANA tz, defaults to UTC
	channelId?: string          // target channel for channel_*; ignored for dm_reminder
	mentionRoleId?: string      // optional <@&...>
	mentionUserId?: string      // optional <@...>
	payload: {
		content?: string          // plain text body
		embed?: ScheduledEmbedPayload
	}
	status: ScheduleStatus
	nextRunAt: Date | null      // indexed — when worker scans
	lastRunAt: Date | null
	runCount: number
	errorCount: number
	lastError?: string
	createdAt: Date
	updatedAt: Date
}

const embedSchema = new mongoose.Schema<ScheduledEmbedPayload>({
	title:       String,
	description: String,
	color:       Number,
	footer:      String,
	url:         String,
	thumbnail:   String,
	image:       String,
}, { _id: false })

const schema = new mongoose.Schema<ScheduledTask>({
	guildId:        { type: String, required: true, index: true },
	createdBy:      { type: String, required: true },
	type:           { type: String, enum: ["dm_reminder", "channel_message", "channel_embed"], required: true },
	scheduleKind:   { type: String, enum: ["once", "cron"], required: true },
	whenIso:        { type: Date },
	cron:           { type: String },
	tz:             { type: String, default: "UTC" },
	channelId:      String,
	mentionRoleId:  String,
	mentionUserId:  String,
	payload:        {
		content: String,
		embed:   embedSchema,
	},
	status:         { type: String, enum: ["active", "paused", "fired", "cancelled", "errored"], default: "active", index: true },
	nextRunAt:      { type: Date, default: null, index: true },
	lastRunAt:      { type: Date, default: null },
	runCount:       { type: Number, default: 0 },
	errorCount:     { type: Number, default: 0 },
	lastError:      String,
}, {
	timestamps: true,
	collection: "nest_scheduled_tasks",
})

// Compound index for the worker's main query path
schema.index({ status: 1, nextRunAt: 1 })
// Per-user listing
schema.index({ guildId: 1, createdBy: 1, status: 1 })

export default mongoose.model<ScheduledTask>("ScheduledTask", schema)
