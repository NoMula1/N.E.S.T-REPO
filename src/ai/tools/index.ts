/* ============================================================
   NightHawk AI — central tool registry + dispatch.
   Combines every tool module and routes each tool_use block to
   the right handler.
============================================================ */
import type { Guild, GuildMember, Message } from "discord.js"
import { SERVER_MGMT_TOOL_DEFINITIONS, executeServerMgmtTool } from "./serverManagement"
import { INQUIRY_TOOL_DEFINITIONS, executeInquiryTool } from "./userInquiry"
import { CONTENT_TOOL_DEFINITIONS, executeContentTool } from "./content"
import { MODERATION_TOOL_DEFINITIONS, executeModerationTool } from "./moderation"
import { SERVER_INFO_TOOL_DEFINITIONS, executeServerInfoTool } from "./serverInfo"
import { SCHEDULING_TOOL_DEFINITIONS, executeSchedulingTool } from "./scheduling"
import { MEMORY_TOOL_DEFINITIONS, executeMemoryTool } from "./memory"

export const ALL_TOOL_DEFINITIONS = [
	...SERVER_MGMT_TOOL_DEFINITIONS,
	...CONTENT_TOOL_DEFINITIONS,
	...MODERATION_TOOL_DEFINITIONS,
	...INQUIRY_TOOL_DEFINITIONS,
	...SERVER_INFO_TOOL_DEFINITIONS,
	...SCHEDULING_TOOL_DEFINITIONS,
	...MEMORY_TOOL_DEFINITIONS,
]

const SERVER_MGMT_NAMES  = new Set(SERVER_MGMT_TOOL_DEFINITIONS.map(t => t.name))
const CONTENT_NAMES      = new Set(CONTENT_TOOL_DEFINITIONS.map(t => t.name))
const MOD_NAMES          = new Set(MODERATION_TOOL_DEFINITIONS.map(t => t.name))
const INQUIRY_NAMES      = new Set(INQUIRY_TOOL_DEFINITIONS.map(t => t.name))
const SERVER_INFO_NAMES  = new Set(SERVER_INFO_TOOL_DEFINITIONS.map(t => t.name))
const SCHEDULING_NAMES   = new Set(SCHEDULING_TOOL_DEFINITIONS.map(t => t.name))
const MEMORY_NAMES       = new Set(MEMORY_TOOL_DEFINITIONS.map(t => t.name))

interface ExecContext {
	guild: Guild
	message: Message
	actor: GuildMember
}

/** Execute a tool by name. Returns a string result that goes back to Claude. */
export async function executeTool(
	toolName: string,
	input: Record<string, unknown>,
	ctx: ExecContext,
): Promise<string> {
	if (SERVER_MGMT_NAMES.has(toolName))  return executeServerMgmtTool(toolName, input, ctx)
	if (CONTENT_NAMES.has(toolName))      return executeContentTool(toolName, input, ctx)
	if (MOD_NAMES.has(toolName))          return executeModerationTool(toolName, input, ctx)
	if (INQUIRY_NAMES.has(toolName))      return executeInquiryTool(toolName, input, { guild: ctx.guild, message: ctx.message })
	if (SERVER_INFO_NAMES.has(toolName))  return executeServerInfoTool(toolName, input, { guild: ctx.guild, message: ctx.message })
	if (SCHEDULING_NAMES.has(toolName))   return executeSchedulingTool(toolName, input, ctx)
	if (MEMORY_NAMES.has(toolName))       return executeMemoryTool(toolName, input, ctx)
	return `Error: unknown tool '${toolName}'`
}
