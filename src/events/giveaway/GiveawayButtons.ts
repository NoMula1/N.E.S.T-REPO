import Giveaway from "../../schemas/Giveaway"
import { memberHasRequiredRole } from "../../utils/giveawayUtils"
import { Log } from "../../utils/logging"

export default {
  async onInteractionCreate(_: any, interaction: any) {
    try {
      if (!interaction.isButton()) return
      const id = interaction.customId
      if (!id?.startsWith("giveaway_enter:")) return
      const gid = id.split(":")[1]
      if (!gid) return

      const giveaway = await Giveaway.findById(gid)
      if (!giveaway || giveaway.status !== "active") {
        await interaction.reply({ content: "This giveaway is no longer active.", ephemeral: true })
        return
      }

      const member = interaction.inGuild() ? await interaction.guild!.members.fetch(interaction.user.id).catch(() => null) : null
      if (!memberHasRequiredRole(member, giveaway.requiredRoleId)) {
        await interaction.reply({ content: `You don't have the required role to enter this giveaway.`, ephemeral: true })
        return
      }

      await Giveaway.findByIdAndUpdate(gid, { $addToSet: { entrants: interaction.user.id } })
      await interaction.reply({ content: "You have been entered into the giveaway. Good luck!", ephemeral: true })
      Log.info(`[giveaway] ${interaction.user.id} entered giveaway ${gid}`)
    } catch (e) {
      Log.warn(`[giveaway] button handler fail: ${(e as Error).message}`)
      try { await interaction.reply({ content: "Something went wrong while entering the giveaway.", ephemeral: true }) } catch {}
    }
  }
}
