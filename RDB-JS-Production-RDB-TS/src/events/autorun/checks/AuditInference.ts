/**
 * AuditInference.ts
 * 
 * Handles inferred case logging
 */

import { Log } from "../../../utils/logging"
import mongoose from "mongoose"
import { ActivityType, AuditLogEvent, ChannelType, Events, Guild, GuildAuditLogsEntry, Message, ThreadChannel } from "discord.js"
import { fastFlagList } from "../../../utils/fastFlags"
import FastFlag from "../../../schemas/FastFlag"
import { EventOptions } from "../../../utils/RegisterEvents"
import Case from "../../../schemas/Case"
import { getLengthFromString, incrimentCase } from "../../../utils/GenUtils"

// Notice: to spare NEST resources & storage space in the DB, only __sensitive actions__ can be whitelisted, like bans or kicks. Insensitive actions like deleting messages should not be whitelisted.
// Whitelisted options also must contain a `targetId` for inferring purposes
const LOG_TYPE_WHITELIST = [
	AuditLogEvent.MemberKick,
	AuditLogEvent.MemberBanAdd,
	AuditLogEvent.MemberBanRemove,
	AuditLogEvent.MemberUpdate
]
const REVERSE_LOG_TYPE: any = {
	20: 'MEMBER_KICK',
	22: 'MEMBER_BAN_ADD',
	23: 'MEMBER_BAN_LIFT',
	24: 'MEMBER_UPDATE'
}
const CHANGE_KEY_WHITELIST = [
	"nick",
	"communication_disabled_until"
]

export default {
	name: Events.GuildAuditLogEntryCreate,
	once: false,
	async execute(_: EventOptions, logEntry: GuildAuditLogsEntry, guild: Guild) {
		const { action, extra: channel, executorId, targetId, changes, reason } = logEntry

		// Ignore NEST actions
		if (!executorId || executorId === _.client.user!.id) return
		if (executorId === "1259957235862343801") return
		if (!targetId) return
		if (executorId === targetId) return
		if (!LOG_TYPE_WHITELIST.includes(action)) return

		const batchedUpdateBlock: any = {
			target: targetId,
			batchedItems: []
		}

		switch (action) {
			case AuditLogEvent.MemberUpdate: {
				// Requires extra processing
				for (const entryChange of changes) {
					if (!CHANGE_KEY_WHITELIST.includes(entryChange.key)) continue

					batchedUpdateBlock.batchedItems.push({
						updateType: "key",
						higherAction: REVERSE_LOG_TYPE[action]!,
						key: entryChange.key,
						old: entryChange.old,
						new: entryChange.new,
						reason: reason
					})
				}
				break
			}
			default: {
				batchedUpdateBlock.batchedItems.push({
					updateType: "base",
					action: REVERSE_LOG_TYPE[action]!,
					reason: reason
				})
				break
			}
		}

		let caseDescriptionFinal = `\n\`\`\`[Auto-Inferred Action]\nSource: Audit Log`
		for (const batchEntry of batchedUpdateBlock.batchedItems) {
			caseDescriptionFinal += '\n\n'
			if (batchEntry.updateType === "key") {
				caseDescriptionFinal += `Sub-Key Change [${batchEntry.higherAction} :: ${batchEntry.key}]\n\tOldValue: \`${batchEntry.old}\`\n\tNewValue: \`${batchEntry.new}\`\n\tReason: *${batchEntry.reason}* <END>`
			} else if (batchEntry.updateType === "base") {
				caseDescriptionFinal += `Base Entry [${batchEntry.action}]\n\tReason: *${batchEntry.reason}* <END>`
			}
		}
		caseDescriptionFinal += '\n\`\`\`'
		const caseNumber = await incrimentCase(guild)
		const absurdDuration: any = await getLengthFromString("30d")
		const newCase = new Case({
			guildID: guild.id,
			userID: targetId!,
			modID: executorId!,
			caseNumber: caseNumber,
			caseType: "MODERATION_INFER",
			reason: caseDescriptionFinal,
			duration: absurdDuration[1],
			durationUnix: (Math.floor(Date.now() / 1000) + absurdDuration[0]!),
			active: true,
			dateIssued: Date.now()
		})
		newCase.save().catch((err: Error) => {
			console.log(err)
		})
	}
}