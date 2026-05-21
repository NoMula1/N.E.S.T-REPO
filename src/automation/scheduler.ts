/* ============================================================
   Scheduler worker — polls nest_scheduled_tasks every 30s and
   executes anything whose nextRunAt has passed.

   - One-shot ('once'): fires once, status -> 'fired'
   - Recurring ('cron'): fires, computes next nextRunAt, stays active

   Execution targets:
   - dm_reminder       → DM the creator (mention copy may DM extra user)
   - channel_message   → post plain text to channelId
   - channel_embed     → post an embed to channelId

   Errors increment errorCount; after 5 consecutive errors the task is
   moved to status 'errored' and stops being scheduled.
============================================================ */
import { Client, EmbedBuilder, TextChannel } from "discord.js"
import ScheduledTask from "../schemas/ScheduledTask"
import type { ScheduledTask as ScheduledTaskShape, ScheduledEmbedPayload } from "../schemas/ScheduledTask"
import { Log } from "../utils/logging"

const TICK_INTERVAL_MS = 30_000
const MAX_CONSECUTIVE_ERRORS = 5

let _tickHandle: NodeJS.Timeout | null = null
let _running = false

export function startScheduler(client: Client): void {
	if (_tickHandle) return
	Log.info(`[scheduler] worker starting (tick every ${TICK_INTERVAL_MS / 1000}s)`)
	const run = async () => {
		if (_running) return
		_running = true
		try {
			await tick(client)
		} catch (e) {
			Log.error("[scheduler] tick crashed: " + (e as Error).message)
		} finally {
			_running = false
		}
	}
	// Run once on boot (slight delay so bot fully connects), then every 30s.
	// Also do a self-check log so we know in production that the worker is alive.
	setTimeout(async () => {
		try {
			const total = await ScheduledTask.countDocuments({})
			const active = await ScheduledTask.countDocuments({ status: "active" })
			Log.info(`[scheduler] boot self-check — DB has ${total} task(s) total, ${active} active`)
		} catch (e) {
			Log.warn(`[scheduler] boot self-check failed: ${(e as Error).message}`)
		}
		run()
	}, 4000)
	_tickHandle = setInterval(run, TICK_INTERVAL_MS)
}

export function stopScheduler(): void {
	if (_tickHandle) { clearInterval(_tickHandle); _tickHandle = null }
}

async function tick(client: Client): Promise<void> {
	const now = new Date()
	// Find up to 50 due tasks at a time
	const due = await ScheduledTask.find({
		status: "active",
		nextRunAt: { $ne: null, $lte: now },
	}).limit(50).lean()

	if (due.length === 0) return
	Log.info(`[scheduler] firing ${due.length} task(s)`)

	for (const task of due) {
		try {
			await executeTask(client, task as unknown as ScheduledTaskShape & { _id: unknown })
		} catch (e) {
			Log.warn(`[scheduler] task ${String((task as any)._id)} failed: ${(e as Error).message}`)
			await ScheduledTask.findByIdAndUpdate((task as any)._id, {
				$inc: { errorCount: 1 },
				$set: { lastError: (e as Error).message.slice(0, 500) },
			}).catch(() => {})
			// Disable after too many consecutive errors
			const fresh = await ScheduledTask.findById((task as any)._id).lean()
			if (fresh && fresh.errorCount >= MAX_CONSECUTIVE_ERRORS) {
				await ScheduledTask.findByIdAndUpdate((task as any)._id, { $set: { status: "errored", nextRunAt: null } }).catch(() => {})
				Log.warn(`[scheduler] task ${String((task as any)._id)} disabled after ${MAX_CONSECUTIVE_ERRORS} errors`)
			}
		}
	}
}

async function executeTask(client: Client, task: ScheduledTaskShape & { _id: unknown }): Promise<void> {
	Log.info(`[scheduler] executing task ${String(task._id)} type=${task.type} createdBy=${task.createdBy}`)

	switch (task.type) {
		case "dm_reminder": {
			// DMs don't need a guild — fetch the user globally and DM them.
			const user = await client.users.fetch(task.createdBy).catch((e: unknown) => {
				Log.warn(`[scheduler] users.fetch failed: ${(e as Error).message}`)
				return null
			})
			if (!user) throw new Error("creator user not fetchable from Discord API")
			const text = formatMessage(task)
			try {
				await user.send({ content: text || "(reminder)" })
				Log.info(`[scheduler] DM'd reminder to ${user.tag}`)
			} catch (e) {
				throw new Error(`DM send failed (user may have DMs blocked): ${(e as Error).message}`)
			}
			break
		}
		case "channel_message": {
			if (!task.channelId) throw new Error("missing channelId")
			const guild = client.guilds.cache.get(task.guildId)
			if (!guild) throw new Error(`guild ${task.guildId} not in cache`)
			const ch = await guild.channels.fetch(task.channelId).catch(() => null)
			if (!ch || !(ch instanceof TextChannel)) throw new Error("channel not a text channel")
			await ch.send({ content: formatMessage(task) })
			break
		}
		case "channel_embed": {
			if (!task.channelId) throw new Error("missing channelId")
			const guild = client.guilds.cache.get(task.guildId)
			if (!guild) throw new Error(`guild ${task.guildId} not in cache`)
			const ch = await guild.channels.fetch(task.channelId).catch(() => null)
			if (!ch || !(ch instanceof TextChannel)) throw new Error("channel not a text channel")
			await ch.send({
				content: formatMentionsLine(task),
				embeds: [buildEmbed(task.payload.embed)],
			})
			break
		}
	}

	// Advance state
	if (task.scheduleKind === "once") {
		await ScheduledTask.findByIdAndUpdate(task._id, {
			$set: { status: "fired", nextRunAt: null, lastRunAt: new Date(), lastError: "" },
			$inc: { runCount: 1 },
		})
	} else {
		// 'cron' — compute next run, keep active
		const next = task.cron ? nextCronRun(task.cron, new Date()) : null
		await ScheduledTask.findByIdAndUpdate(task._id, {
			$set: { nextRunAt: next, lastRunAt: new Date(), lastError: "", errorCount: 0 },
			$inc: { runCount: 1 },
		})
	}
}

function formatMentionsLine(task: ScheduledTaskShape): string {
	const parts: string[] = []
	if (task.mentionRoleId) parts.push(`<@&${task.mentionRoleId}>`)
	if (task.mentionUserId) parts.push(`<@${task.mentionUserId}>`)
	return parts.join(" ")
}

function formatMessage(task: ScheduledTaskShape): string {
	const mentions = formatMentionsLine(task)
	const content = task.payload.content || ""
	return [mentions, content].filter(Boolean).join("\n").trim() || "(reminder)"
}

function buildEmbed(p: ScheduledEmbedPayload | undefined): EmbedBuilder {
	const e = new EmbedBuilder()
	if (!p) return e.setDescription("(no embed body)")
	if (p.title) e.setTitle(p.title.slice(0, 256))
	if (p.description) e.setDescription(p.description.slice(0, 4000))
	if (typeof p.color === "number") e.setColor(p.color)
	if (p.footer) e.setFooter({ text: p.footer.slice(0, 2048) })
	if (p.url) e.setURL(p.url)
	if (p.thumbnail) e.setThumbnail(p.thumbnail)
	if (p.image) e.setImage(p.image)
	return e
}

/* ─────────────────────────────────────────────
   Cron-expression evaluator (minimal 5-field).
   Field order: minute hour dayOfMonth month dayOfWeek
   Supports: wildcards (asterisk), comma lists, ranges, slash-N steps.
   Day-of-week: 0-6 (Sun-Sat) OR mon|tue|wed|thu|fri|sat|sun.
   Returns the next Date >= the passed-in moment (exclusive of it).
   Caps lookahead at 365 days to avoid pathological inputs.
───────────────────────────────────────────── */
export function nextCronRun(expr: string, from: Date): Date | null {
	const fields = expr.trim().split(/\s+/)
	if (fields.length !== 5) return null
	const [minF, hourF, dayF, monthF, dowF] = fields

	const minutes  = parseField(minF,  0, 59)
	const hours    = parseField(hourF, 0, 23)
	const days     = parseField(dayF,  1, 31)
	const months   = parseField(monthF, 1, 12)
	const dows     = parseDowField(dowF)
	if (!minutes || !hours || !days || !months || !dows) return null

	// Walk forward minute-by-minute. Slow but bounded by 365d cap; for
	// realistic schedules ('every day at 9am') it skips to next match fast.
	const cutoff = from.getTime() + 365 * 86400 * 1000
	let t = new Date(from.getTime())
	t.setUTCSeconds(0, 0)
	t = new Date(t.getTime() + 60_000) // start from next minute

	while (t.getTime() < cutoff) {
		const m = t.getUTCMinutes()
		const h = t.getUTCHours()
		const dom = t.getUTCDate()
		const mon = t.getUTCMonth() + 1
		const dow = t.getUTCDay()
		if (
			minutes.has(m) && hours.has(h) && months.has(mon) &&
			(days.has(dom) || dows.has(dow))   // cron OR semantics for day fields when both restricted
		) return t
		t = new Date(t.getTime() + 60_000)
	}
	return null
}

function parseField(field: string, min: number, max: number): Set<number> | null {
	const out = new Set<number>()
	const parts = field.split(",")
	for (const p of parts) {
		const m = /^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/.exec(p.trim())
		if (!m) return null
		const range = m[1], stepStr = m[2]
		const step = stepStr ? parseInt(stepStr, 10) : 1
		if (step <= 0) return null
		let lo: number, hi: number
		if (range === "*") { lo = min; hi = max }
		else if (range.includes("-")) {
			const [a, b] = range.split("-").map(n => parseInt(n, 10))
			if (!isFinite(a) || !isFinite(b)) return null
			lo = a; hi = b
		} else {
			const v = parseInt(range, 10)
			if (!isFinite(v)) return null
			lo = v; hi = v
		}
		if (lo < min || hi > max || lo > hi) return null
		for (let n = lo; n <= hi; n += step) out.add(n)
	}
	return out
}

function parseDowField(field: string): Set<number> | null {
	const NAMES: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }
	const lowered = field.toLowerCase()
	// Substitute names with numbers, then defer to parseField
	const normalized = lowered.replace(/sun|mon|tue|wed|thu|fri|sat/g, m => String(NAMES[m]))
	// Map 7 → 0 (some systems use 7 for Sunday)
	const set = parseField(normalized.replace(/\b7\b/g, "0"), 0, 6)
	return set
}
