/* ============================================================
   NightHawk AI — Scheduling tools.
   The AI uses these to set up reminders & recurring announcements.

   Time format:
   - one-shots: pass `when_iso` as a UTC ISO 8601 string (e.g.
     "2026-05-21T17:30:00Z"). The AI converts human times to ISO.
   - recurring: pass `cron` as a 5-field cron expression in UTC
     (e.g. "30 12 * * *" = 12:30 UTC every day).

   Scope:
   - schedule_reminder: DM the user who asked (private; defaults)
   - schedule_announcement: post to a channel publicly
   - list_my_schedules / list_server_schedules
   - cancel_schedule / pause_schedule / resume_schedule
============================================================ */
import type { Guild, GuildMember, Message } from "discord.js"
import ScheduledTask from "../../schemas/ScheduledTask"
import { nextCronRun } from "../../automation/scheduler"

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

export const SCHEDULING_TOOL_DEFINITIONS: Tool[] = [
	{
		name: "schedule_reminder",
		description: "DM the requesting user a reminder at a future time. Default and most common form — use this when the user says 'remind me to ___ at ___'. Always DM-based; the user gets a private message at the scheduled time. For natural-language times like 'in 2 hours' or 'tomorrow at 3pm', convert to a UTC ISO 8601 timestamp first. For recurring like 'every weekday at 10pm', use the cron field instead.",
		input_schema: {
			type: "object",
			properties: {
				message: { type: "string", description: "The reminder text the user will see when DM'd." },
				when_iso: { type: "string", description: "UTC ISO 8601 timestamp for a one-shot reminder, e.g. '2026-05-21T17:30:00Z'. Omit if using `cron`." },
				cron: { type: "string", description: "5-field cron expression in UTC for recurring reminders, e.g. '0 22 * * 1-5' = 10pm UTC every weekday. Omit if using `when_iso`." },
			},
			required: ["message"],
		},
	},
	{
		name: "schedule_announcement",
		description: "Post a message (plain text or embed) to a channel at a future time, optionally recurring. Use this for 'every Monday at 9am post stats in #mod-internal' or 'tomorrow at noon announce the event in #general'. The channel_id MUST belong to this guild.",
		input_schema: {
			type: "object",
			properties: {
				channel_id: { type: "string", description: "Target Discord channel ID." },
				content: { type: "string", description: "Plain text body of the post. Use this OR embed (or both)." },
				embed: {
					type: "object",
					description: "Optional embed payload. All fields optional.",
					properties: {
						title:       { type: "string" },
						description: { type: "string" },
						color:       { type: "number", description: "Decimal color, e.g. 15158332 for red." },
						footer:      { type: "string" },
						url:         { type: "string" },
						thumbnail:   { type: "string", description: "Thumbnail URL." },
						image:       { type: "string", description: "Large image URL." },
					},
				},
				mention_role_id: { type: "string", description: "Optional role to ping along with the post." },
				when_iso: { type: "string", description: "UTC ISO 8601 timestamp for a one-shot announcement." },
				cron: { type: "string", description: "5-field cron in UTC for recurring announcements." },
			},
			required: ["channel_id"],
		},
	},
	{
		name: "list_my_schedules",
		description: "Return active scheduled tasks the requesting user created. Use this when the user asks 'what reminders do I have?' or 'show my schedules'.",
		input_schema: { type: "object", properties: {} },
	},
	{
		name: "list_server_schedules",
		description: "Return all active scheduled tasks in this guild (regardless of creator). Use this when staff asks to audit recurring posts or reminders across the server.",
		input_schema: { type: "object", properties: {} },
	},
	{
		name: "cancel_schedule",
		description: "Permanently cancel a scheduled task. The user can only cancel their own; admins can cancel any.",
		input_schema: {
			type: "object",
			properties: {
				task_id: { type: "string", description: "The Mongo _id of the scheduled task." },
			},
			required: ["task_id"],
		},
	},
	{
		name: "pause_schedule",
		description: "Temporarily pause a scheduled task (doesn't delete it; use resume_schedule to re-enable).",
		input_schema: {
			type: "object",
			properties: { task_id: { type: "string" } },
			required: ["task_id"],
		},
	},
	{
		name: "resume_schedule",
		description: "Resume a paused scheduled task.",
		input_schema: {
			type: "object",
			properties: { task_id: { type: "string" } },
			required: ["task_id"],
		},
	},
]

/* ── Helpers ───────────────────────────────── */
function parseIso(input: unknown): Date | null {
	if (typeof input !== "string") return null
	const t = Date.parse(input)
	if (!isFinite(t)) return null
	return new Date(t)
}

function computeNextRun(input: { when_iso?: unknown; cron?: unknown }): { kind: "once" | "cron"; when?: Date; cron?: string; nextRunAt: Date } | { error: string } {
	const iso = parseIso(input.when_iso)
	const cron = typeof input.cron === "string" ? input.cron.trim() : ""

	if (cron) {
		const next = nextCronRun(cron, new Date())
		if (!next) return { error: `Invalid cron expression: "${cron}"` }
		return { kind: "cron", cron, nextRunAt: next }
	}
	if (iso) {
		if (iso.getTime() <= Date.now() + 1000) return { error: "Scheduled time is in the past — pick a future time." }
		if (iso.getTime() > Date.now() + 365 * 86400 * 1000) return { error: "Scheduled time is more than 1 year out — pick something sooner." }
		return { kind: "once", when: iso, nextRunAt: iso }
	}
	return { error: "Need either when_iso (one-shot) or cron (recurring)." }
}

function formatTask(t: any): string {
	const id = String(t._id)
	const kind = t.scheduleKind === "cron" ? `cron \`${t.cron}\`` : `once at ${t.whenIso ? new Date(t.whenIso).toISOString() : "?"}`
	const where =
		t.type === "dm_reminder" ? "DM" :
		t.channelId ? `<#${t.channelId}>` : "?"
	const body = (t.payload?.content || t.payload?.embed?.title || t.payload?.embed?.description || "").toString().slice(0, 80)
	const next = t.nextRunAt ? new Date(t.nextRunAt).toISOString() : "n/a"
	return `• \`${id}\` [${t.status}] ${where} · ${kind} · next: ${next}\n   "${body}"`
}

async function isAdmin(ctx: ExecCtx): Promise<boolean> {
	const perms = ctx.actor.permissions
	return perms.has("Administrator") || perms.has("ManageGuild")
}

/* ── Executor ──────────────────────────────── */
export async function executeSchedulingTool(
	name: string,
	input: Record<string, unknown>,
	ctx: ExecCtx,
): Promise<string> {
	const { guild, actor } = ctx

	switch (name) {
		case "schedule_reminder": {
			const message = (input.message as string | undefined)?.trim()
			if (!message) return "Error: `message` is required."
			const sched = computeNextRun(input)
			if ("error" in sched) return `Error: ${sched.error}`

			const doc = await ScheduledTask.create({
				guildId: guild.id,
				createdBy: actor.id,
				type: "dm_reminder",
				scheduleKind: sched.kind,
				whenIso: sched.kind === "once" ? sched.when : undefined,
				cron: sched.kind === "cron" ? sched.cron : undefined,
				tz: "UTC",
				payload: { content: message.slice(0, 1500) },
				nextRunAt: sched.nextRunAt,
				status: "active",
			})
			return `Scheduled reminder \`${doc._id}\` — next fires ${sched.nextRunAt.toISOString()} (UTC) via DM to ${actor.user.tag}.`
		}

		case "schedule_announcement": {
			const channelId = input.channel_id as string | undefined
			if (!channelId) return "Error: `channel_id` is required."
			const ch = await guild.channels.fetch(channelId).catch(() => null)
			if (!ch) return `Error: channel ${channelId} not found in this guild.`
			if (!ch.isTextBased?.()) return `Error: channel ${channelId} is not a text channel.`

			const content = (input.content as string | undefined)?.trim()
			const embed = input.embed as ScheduledEmbedInput | undefined
			if (!content && !embed) return "Error: provide `content` and/or `embed`."

			const sched = computeNextRun(input)
			if ("error" in sched) return `Error: ${sched.error}`

			const doc = await ScheduledTask.create({
				guildId: guild.id,
				createdBy: actor.id,
				type: embed ? "channel_embed" : "channel_message",
				scheduleKind: sched.kind,
				whenIso: sched.kind === "once" ? sched.when : undefined,
				cron: sched.kind === "cron" ? sched.cron : undefined,
				tz: "UTC",
				channelId,
				mentionRoleId: typeof input.mention_role_id === "string" ? input.mention_role_id : undefined,
				payload: {
					content: content?.slice(0, 1900),
					embed: embed ? {
						title: clip(embed.title, 256),
						description: clip(embed.description, 4000),
						color: typeof embed.color === "number" ? embed.color : undefined,
						footer: clip(embed.footer, 2048),
						url: clip(embed.url, 2048),
						thumbnail: clip(embed.thumbnail, 2048),
						image: clip(embed.image, 2048),
					} : undefined,
				},
				nextRunAt: sched.nextRunAt,
				status: "active",
			})
			return `Scheduled announcement \`${doc._id}\` to <#${channelId}> — next fires ${sched.nextRunAt.toISOString()} (UTC). Kind: ${sched.kind}.`
		}

		case "list_my_schedules": {
			const tasks = await ScheduledTask.find({
				guildId: guild.id,
				createdBy: actor.id,
				status: { $in: ["active", "paused"] },
			}).sort({ nextRunAt: 1 }).limit(25).lean()
			if (tasks.length === 0) return "You have no active scheduled tasks."
			return `Your active scheduled tasks (${tasks.length}):\n${tasks.map(formatTask).join("\n")}`
		}

		case "list_server_schedules": {
			if (!(await isAdmin(ctx))) return "Error: only admins/server managers can list all server schedules."
			const tasks = await ScheduledTask.find({
				guildId: guild.id,
				status: { $in: ["active", "paused"] },
			}).sort({ nextRunAt: 1 }).limit(50).lean()
			if (tasks.length === 0) return "No active scheduled tasks in this server."
			return `Active scheduled tasks (${tasks.length}):\n${tasks.map(formatTask).join("\n")}`
		}

		case "cancel_schedule":
		case "pause_schedule":
		case "resume_schedule": {
			const taskId = input.task_id as string
			if (!taskId || !/^[a-f0-9]{24}$/i.test(taskId)) return "Error: invalid task_id."
			const task = await ScheduledTask.findOne({ _id: taskId, guildId: guild.id }).lean()
			if (!task) return `Error: task ${taskId} not found in this guild.`
			if (task.createdBy !== actor.id && !(await isAdmin(ctx))) {
				return "Error: only the task's creator or an admin can modify it."
			}
			if (name === "cancel_schedule") {
				await ScheduledTask.findByIdAndUpdate(taskId, { $set: { status: "cancelled", nextRunAt: null } })
				return `Cancelled task \`${taskId}\`.`
			}
			if (name === "pause_schedule") {
				await ScheduledTask.findByIdAndUpdate(taskId, { $set: { status: "paused" } })
				return `Paused task \`${taskId}\`.`
			}
			// resume
			const fresh = await ScheduledTask.findById(taskId).lean()
			if (!fresh) return "Error: task vanished."
			const next = fresh.scheduleKind === "cron" && fresh.cron
				? nextCronRun(fresh.cron, new Date())
				: fresh.whenIso && fresh.whenIso.getTime() > Date.now()
				? fresh.whenIso
				: null
			if (!next) return "Cannot resume — the next run time is in the past or invalid. Cancel and recreate instead."
			await ScheduledTask.findByIdAndUpdate(taskId, { $set: { status: "active", nextRunAt: next } })
			return `Resumed task \`${taskId}\` — next fires ${next.toISOString()} (UTC).`
		}
	}
	return `Error: unknown scheduling tool '${name}'`
}

/* ── Local types ───────────────────────────── */
interface ScheduledEmbedInput {
	title?: string
	description?: string
	color?: number
	footer?: string
	url?: string
	thumbnail?: string
	image?: string
}

function clip(v: unknown, max: number): string | undefined {
	if (typeof v !== "string") return undefined
	return v.slice(0, max)
}
