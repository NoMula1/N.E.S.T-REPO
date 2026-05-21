/* ============================================================
   /nh-ask — slash-command entry point for NightHawk AI.
   Same gating + Claude call as @-mention, but:
   - Question comes from a slash option, not @-mention text
   - Reply is ephemeral (only the asker sees it)
   - Only read-only tools (get_user_info, search_messages, list_server_structure)
     so we skip the button-based confirmation flow for v1
============================================================ */
import { MessageFlags, type ChatInputCommandInteraction } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { getAnthropic, DEFAULT_MODEL } from "../../../ai/client"
import { SYSTEM_PROMPT } from "../../../ai/systemPrompt"
import { isAllowedGuild, memberCanUseAi, checkRateLimit } from "../../../ai/safeguards"
import { getFreshGuildConfig } from "../../../utils/GuildConfigCache"
import { INQUIRY_TOOL_DEFINITIONS, executeInquiryTool } from "../../../ai/tools/userInquiry"
import { Log } from "../../../utils/logging"
import type Anthropic from "@anthropic-ai/sdk"

const MAX_TOOL_ITERATIONS = 5

async function runAsk(interaction: ChatInputCommandInteraction) {
	const question = interaction.options.getString("question", true)

	if (!interaction.guild || !interaction.member) {
		await interaction.reply({ content: "❌ Run this in a server.", flags: MessageFlags.Ephemeral })
		return
	}

	if (!isAllowedGuild(interaction.guildId || undefined)) {
		await interaction.reply({ content: "❌ NightHawk AI is not enabled on this server.", flags: MessageFlags.Ephemeral })
		return
	}

	const cfg = await getFreshGuildConfig(interaction.guildId!)
	if (!cfg?.aiAccess?.enabled) {
		await interaction.reply({ content: "❌ NightHawk AI is currently disabled here. Ask staff to enable it in the NEST dashboard.", flags: MessageFlags.Ephemeral })
		return
	}

	// Fetch GuildMember (interaction.member is sometimes APIInteractionGuildMember)
	const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null)
	if (!member) {
		await interaction.reply({ content: "❌ Couldn't resolve your member info.", flags: MessageFlags.Ephemeral })
		return
	}

	if (!memberCanUseAi(member, cfg)) {
		await interaction.reply({ content: "❌ You don't have the required role to use NightHawk AI.", flags: MessageFlags.Ephemeral })
		return
	}

	const rl = checkRateLimit(interaction.user.id)
	if (!rl.ok) {
		await interaction.reply({ content: `⏳ Slow down — try again in ${rl.retryAfter}s.`, flags: MessageFlags.Ephemeral })
		return
	}

	const anthropic = getAnthropic()
	if (!anthropic) {
		await interaction.reply({ content: "⚠️ AI feature is misconfigured. (ANTHROPIC_API_KEY missing)", flags: MessageFlags.Ephemeral })
		return
	}

	await interaction.deferReply({ flags: MessageFlags.Ephemeral })

	const isOwner = !!process.env.NIGHTHAWK_OWNER_ID && interaction.user.id === process.env.NIGHTHAWK_OWNER_ID
	const identityLine = isOwner
		? `[AUTHOR: ${interaction.user.username} (Discord ID ${interaction.user.id}) — NIGHTHAWK OWNER · privileged]`
		: `[AUTHOR: ${interaction.user.username} (Discord ID ${interaction.user.id}) — standard user]`

	const userTurn =
		`Note: this is a /nh-ask invocation (ephemeral — only the asker sees the response). ` +
		`No destructive tools are available in this context (only get_user_info, search_messages, list_server_structure).\n\n` +
		identityLine + "\n" +
		`Server ID: ${interaction.guildId}\n\n` +
		`${interaction.user.username} asked you:\n${question}`

	const conversation: Anthropic.MessageParam[] = [
		{ role: "user", content: userTurn },
	]

	const model = cfg.aiAccess.model || DEFAULT_MODEL
	let answer = ""

	try {
		for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
			const response: Anthropic.Message = await anthropic.messages.create({
				model,
				max_tokens: 1500,
				system: [
					{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
				],
				tools: INQUIRY_TOOL_DEFINITIONS as Anthropic.Tool[],
				messages: conversation,
			})

			const toolUses = response.content.filter(b => b.type === "tool_use") as Anthropic.ToolUseBlock[]
			const textBlocks = response.content.filter(b => b.type === "text") as Anthropic.TextBlock[]

			conversation.push({ role: "assistant", content: response.content })

			if (response.stop_reason === "end_turn" || toolUses.length === 0) {
				answer = textBlocks.map(b => b.text).join("\n").trim()
				break
			}

			const toolResults: Anthropic.ToolResultBlockParam[] = []
			for (const tool of toolUses) {
				const input = (tool.input || {}) as Record<string, unknown>
				const result = await executeInquiryTool(tool.name, input, { guild: interaction.guild, message: null as any })
				toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: result })
			}
			conversation.push({ role: "user", content: toolResults })
		}

		if (!answer) answer = "(reached the iteration limit — try a simpler question or use @-mention)"
	} catch (e) {
		Log.error("[NightHawk-AI /nh-ask] " + (e as Error).message)
		await interaction.editReply({ content: "⚠️ Claude API error: `" + (e as Error).message.slice(0, 200) + "`" })
		return
	}

	// Discord ephemeral reply: 2000 char limit, no chunking. Truncate cleanly.
	if (answer.length > 1990) answer = answer.slice(0, 1985) + "\n…"
	await interaction.editReply({ content: answer })
}

export default new CommandExecutor()
	.setName("nh-ask")
	.setDescription("Ask NightHawk AI a question privately. Only you'll see the response.")
	.addStringOption(opt =>
		opt.setName("question")
			.setDescription("What do you want to ask?")
			.setRequired(true)
			.setMaxLength(1500))
	.setBasePermission({
		Level: PermissionLevel.None,
	})
	.setExecutor(runAsk)
