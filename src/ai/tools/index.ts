/* ============================================================
   NightHawk AI — central tool registry + dispatch.
   Combines server-management + read-only inquiry tools and routes
   each tool_use block to the right handler.
============================================================ */
import type { Guild, GuildMember, Message } from "discord.js"
import { SERVER_MGMT_TOOL_DEFINITIONS, executeServerMgmtTool } from "./serverManagement"
import { INQUIRY_TOOL_DEFINITIONS, executeInquiryTool } from "./userInquiry"

export const ALL_TOOL_DEFINITIONS = [
	...SERVER_MGMT_TOOL_DEFINITIONS,
	...INQUIRY_TOOL_DEFINITIONS,
]

const SERVER_MGMT_NAMES = new Set(SERVER_MGMT_TOOL_DEFINITIONS.map(t => t.name))
const INQUIRY_NAMES     = new Set(INQUIRY_TOOL_DEFINITIONS.map(t => t.name))

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
	if (SERVER_MGMT_NAMES.has(toolName)) {
		return executeServerMgmtTool(toolName, input, ctx)
	}
	if (INQUIRY_NAMES.has(toolName)) {
		return executeInquiryTool(toolName, input, { guild: ctx.guild, message: ctx.message })
	}
	return `Error: unknown tool '${toolName}'`
}
