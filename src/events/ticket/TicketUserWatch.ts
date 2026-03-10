/**
 * AuditInference.ts
 * 
 * Handles inferred case logging
 */

import { Log } from "../../utils/logging"
import mongoose from "mongoose"
import { ActivityType, AuditLogEvent, ChannelType, Events, Guild, GuildAuditLogsEntry, Message, ThreadChannel } from "discord.js"
import { fastFlagList } from "../../utils/fastFlags"
import FastFlag from "../../schemas/FastFlag"
import { EventOptions } from "../../utils/RegisterEvents"
import Case from "../../schemas/Case"
import { getLengthFromString, incrimentCase } from "../../utils/GenUtils"

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
	name: Events.GuildMemberRemove,
	once: false,
	async execute(_: EventOptions, l: any) {

	}
}