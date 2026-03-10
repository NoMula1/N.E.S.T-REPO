/**
 * AuditInference.ts
 * 
 * Handles inferred case logging
 */

import { Events, Interaction } from "discord.js"
import { EventOptions } from "../../utils/RegisterEvents"

export default {
	name: Events.InteractionCreate,
	once: false,
	async execute(_: EventOptions, i: Interaction) {
		if (!i.isStringSelectMenu()) return
		if (!i.inCachedGuild()) return
		// if (!i.ismessage)
	}
}