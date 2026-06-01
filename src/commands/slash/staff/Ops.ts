/* ──────────────────────────────────────────────────────────────────
   /ops — owner-only operations hub.

   ONE command, ZERO options: running it opens an ephemeral control panel
   (see utils/opsHub.ts + events/ops/OpsHub.ts). Every action — Manage
   Embeds, Updates, Update Mode, Configure, Install Emojis — lives behind a
   button and collects ONLY its own inputs (modals + menus) when clicked,
   so nothing clutters anything else and there's a single picker row.

   Locked to the owner ID. Defense-in-depth: IsUser on the base permission
   AND an explicit id check at the top of the executor.
   ────────────────────────────────────────────────────────────────── */
import { PermissionsBitField } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { OWNER_ID, buildRootPanel } from "../../../utils/opsHub"

export default new CommandExecutor()
	.setName("ops")
	.setDescription("Owner operations panel")
	.setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
	.setBasePermission({ Level: PermissionLevel.Developer, IsUser: [OWNER_ID] })
	.setExecutor(async interaction => {
		// Hard owner gate — ignores the dev list / admin bypass.
		if (interaction.user.id !== OWNER_ID) {
			interaction.reply({ content: "This command is locked to the owner.", ephemeral: true })
			return
		}
		if (!interaction.inCachedGuild()) {
			interaction.reply({ content: "Run this inside a server.", ephemeral: true })
			return
		}
		const { embed, rows } = buildRootPanel()
		await interaction.reply({ embeds: [embed], components: rows as any, ephemeral: true })
	})
