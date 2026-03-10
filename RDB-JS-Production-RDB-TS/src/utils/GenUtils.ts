import * as Sentry from "@sentry/node"
import { WebhookClient, EmbedBuilder, Guild, AttachmentBuilder, Channel, GuildBasedChannel, GuildMember, PermissionsBitField, TextChannel, User, InteractionReplyOptions } from "discord.js"
import { Log } from "./logging"
import { config } from "./config"
import Settings from "../schemas/Settings"
import { convertMany } from "convert"

export function handleError(err: Error): void {
	Log.error("Uh oh! NEST has encountered an error.\n" + err.message + "\n" + err.stack)
	Sentry.captureException(err)
	if (!config.error_webhook_url) {
		Log.warn("No error webhook URL was found! Could not send error embed.")
		return
	}
	const webhook = new WebhookClient({ url: config.error_webhook_url })
	const error = new EmbedBuilder()
		.setTitle("NEST Error!")
		.setColor("Red")
		.addFields(
			{ name: "Error:", value: `\`\`\`${err.message}\`\`\`` }
		)
	webhook.send({ embeds: [error] }).catch(() => {
		// Silently fail if webhook send fails (e.g., rate limited, invalid URL)
	})
}

/**
 * Returns the current date an time in a string.
 * @returns {string}
 */
export function timeStringNow(): string {
	const now = new Date()
	return `${now.getUTCDate().toString().padStart(2, "0")}-${(now.getUTCMonth() + 1).toString().padStart(2, "0")}-${now.getUTCFullYear().toString().padStart(4, "0")} ${now.getUTCHours().toString().padStart(2, "0")}:${now.getUTCMinutes().toString().padStart(2, "0")}:${now.getUTCSeconds().toString().padStart(2, "0")}:${now.getUTCMilliseconds().toString().padStart(3, "0")}`
}

export async function createNewGuildFile(guild: Guild) {
	const newSettings = new Settings({
		guildID: guild.id,
		modLogChannel: "None",
		caseCount: 1,
		ticketCount: 1,
		suggestionCount: 1,
		requirePostApproval: false,
	})
	newSettings.save().catch((err: Error) => {
		handleError(err)
	})
}

export async function incrimentCase(guild: Guild): Promise<number> {
	const settings = await Settings.findOne({
		guildID: guild.id
	})

	await settings?.updateOne({
		$inc: { caseCount: 1 }
	})

	return settings?.caseCount || 1
}

export function errorEmbed(string: string): InteractionReplyOptions {
	const errorEmbed = new EmbedBuilder()
		.setColor("Red")
		.setDescription(`${config.failedEmoji} ${string}`)
	return { embeds: [errorEmbed], ephemeral: true }
}

export async function incrimentTicket(guild: Guild): Promise<number> {
	const settings = await Settings.findOne({
		guildID: guild.id
	})

	await settings?.updateOne({
		$inc: { ticketCount: 1 }
	})

	return settings?.ticketCount || 1
}

export async function sendModLogs(
	options: {
		guild: Guild;
		mod: GuildMember;
		target?: GuildMember;
		targetUser?: User;
		action?: string;
		attachments?: Array<AttachmentBuilder>;
	},
	embedDetails: {
		title: string;
		actionInfo: string;
		channel?: Channel;
	}
) {
	const { guild } = options
	const settings = await Settings.findOne({
		guildID: guild.id
	})
	if (!settings) return

	let user: User = options.target?.user!
	if (!user) {
		user = options.targetUser!
	}

	const mod: GuildMember = options.mod
	if (options.targetUser) {
		user = options.targetUser
	}
	let users = `:bust_in_silhouette: **Mod:** ${mod.user.username} (${mod.id})`
	if (user) {
		users = users + `\n:busts_in_silhouette: **User:** ${(user as User).username} (${user.id})`
	}
	const action = `> ${embedDetails.actionInfo}`
	let theChannel = ``
	if (embedDetails.channel) {
		theChannel = `\n:briefcase: **Channel:** <#${embedDetails.channel.id}>`
	}

	const modLogEmbed = new EmbedBuilder()
		.setAuthor({ name: embedDetails.title, iconURL: mod.displayAvatarURL() || undefined })
		.setDescription(`${users} ${theChannel}\n<:clock:1071213725610151987> **Date:** <t:${Math.round(Date.now() / 1000)}:D>\n${action}`)
		.setColor("Green")
	const channel = guild?.channels.cache.find((c: GuildBasedChannel) => c.name.toLowerCase() === "logs")
	if (channel) {
		if (guild.members.me?.permissionsIn(channel!).has([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks])) {
			if (options.attachments) {
				await (guild.channels.cache.find((c: any) => c.id === channel?.id) as TextChannel).send({ embeds: [modLogEmbed], files: options.attachments })
			} else {
				await (guild.channels.cache.find((c: any) => c.id === channel?.id) as TextChannel).send({ embeds: [modLogEmbed] })
			}
		}
	}
}

const timeRe = /([0-9]+)([a-zA-Z]+)/g
const dateplusses = [
	"s",
	"m",
	"h",
	"d",
	"mo",
	"y"
]
export function convertToMilliseconds(time: string) {
	const regex = /(\d+)h|(\d+)m|(\d+)s|(\d+)d/g
	let matches
	let minutes = 0
	let hours = 0
	let seconds = 0
	let days = 0

	while ((matches = regex.exec(time)) !== null) {
		if (matches[1]) {
			hours = Number(matches[1])
		} else if (matches[2]) {
			minutes = Number(matches[2])
		} else if (matches[3]) {
			seconds = Number(matches[3])
		} else if (matches[4]) {
			days = Number(matches[4])
		}
	}

	const milliseconds = (minutes * 60 + hours * 60 * 60 + seconds) * 1000 + days * 24 * 60 * 60 * 1000
	return milliseconds
}
export async function getLengthFromString(date: string): Promise<[number, string] | [null, null]> {
	return new Promise(async (resolve, reject) => {
		const expiration = new Date()
		const t = date
		if (t) {
			const converted = convertShortToLongTime(date)
			resolve([convertToMilliseconds(date) / 1000, converted])
		} else {
			resolve([null, null])
		}
	})
}

/**
 * Returns the current date an time in a string.
 * @param {string} string Input the string you'd like to test for time.
 * @returns {[number, string]}
 */
/*
export function getLengthFromString(string: string): [number, string] | [null, null] {
	try {
		let lengthString: string | null = string;
		if (Number(string)) lengthString = `${string}s`;
		let length = convertStringToTime(lengthString);
		if (!length) return [null, null];
		lengthString = convertShortToLongTime(lengthString);
		if (!lengthString) return [null, null];

		return [length, lengthString];
	} catch (err) {
		return [null, null];
	}
}
*/

function convertStringToTime(string: string): number | null {
	let lengthNum: number | null = null

	if (string.replace(/\d/g, "") == "m") string = string.replace(/\D/g, '').concat("min")

	try { lengthNum = convertMany(string).to('s') }
	catch (err) { return null }

	return lengthNum
}

function convertShortToLongTime(shortTime: string): string {
	const unitsMap: Record<string, string> = {
		y: 'year(s)',
		mo: 'month(s)',
		w: 'week(s)',
		d: 'day(s)',
		h: 'hour(s)',
		m: 'minute(s)',
		s: 'second(s)'
	}

	const timeUnits = shortTime.match(/\d+[ywdhms]|mo/g)
	if (!timeUnits) {
		return ""
	}

	const longTimes = timeUnits.map(timeUnit => {
		const value = parseInt(timeUnit.slice(0, -1), 10)
		const unit = timeUnit.slice(-1)
		const longUnit = unitsMap[unit]

		if (!longUnit) {
			throw new Error(`Invalid time unit: ${unit}`)
		}

		return `${value} ${longUnit}`
	})

	return longTimes.join(', ')
}

/**
 * Returns the current date and time for user display.
 * @param date The date to format.
 */
export function formatDate(date = new Date()): string {
	return `${date.getUTCDate().toString().padStart(2, "0")}-${(date.getUTCMonth() + 1).toString().padStart(2, "0")}-${date.getUTCFullYear().toString().padStart(4, "0")} ${date.getUTCHours().toString().padStart(2, "0")}:${date.getUTCMinutes().toString().padStart(2, "0")}:${date.getUTCSeconds().toString().padStart(2, "0")}:${date.getUTCMilliseconds().toString().padStart(3, "0")}`
}

/**
 * Formats the duration for user display.
 * @param ms The time in milliseconds.
 */
export function formatTime(ms: number): string {
	let seconds = ms / 1000
	const days = Math.floor(seconds / 60 / 60 / 24)
	seconds = seconds - days * 60 * 60 * 24
	const hours = Math.floor(seconds / 60 / 60)
	seconds = seconds - hours * 60 * 60
	const minutes = Math.floor(seconds / 60)
	seconds = Math.floor(seconds - minutes * 60)

	return (days > 0 ? days + ' Days, ' : '') + (hours > 0 ? hours + ' hours, ' : '') + (minutes > 0 ? minutes + ' minutes, ' : '') + seconds + ' seconds'
}
import os from 'os'
export function getMaxRAM(): string {
	const totalRam = os.totalmem() // Total RAM in bytes
	const maxRamInMB = Math.round(totalRam / (1024 * 1024)) // Convert to MB
	return formatRAM(maxRamInMB)
}

export function getUsedRAM(): string {
	const usedRamInMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
	return formatRAM(usedRamInMB)
}

export function formatRAM(ramInMB: number): string {
	if (ramInMB >= 1024) {
		const ramInGB = ramInMB / 1024
		return `${ramInGB.toFixed(2)} GB`
	} else {
		return `${ramInMB} MB`
	}
}
