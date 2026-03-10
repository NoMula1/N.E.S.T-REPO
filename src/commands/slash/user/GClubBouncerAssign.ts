import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"

const GCBouncerRole = "1255002765135052801"
const GCRole = "1229646154971484242"

export default new CommandExecutor()
	.setName("gclubbouncerassign")
	.setDescription("Assign a gentlemens club to someone.")
	.addStringOption(op => op.setName('role').setDescription('The role to assign').setChoices({ name: 'Gentlemens Club', value: 'gc' }).setRequired(true))
	.addUserOption(op => op.setName('user').setDescription('The user').setRequired(true))
	.setBasePermission({
		Level: PermissionLevel.None,
	})
	.setExecutor(async (i) => {
		await i.deferReply({ ephemeral: true })
		const member = await i.guild?.members.fetch(i.user.id)
		if (!member || !member.roles.cache.has(GCBouncerRole)) {
			await i.editReply({ content: 'You dont have permission to use this command.' })
		} else {
			const role = i.options.getString('role', true)
			const user = i.options.getUser('user', true)
			const target = await i.guild?.members.fetch(user.id)

			if (!target) {
				await i.editReply({ content: "Unable to get the mentioned user in the server." })
			} else {
				switch(role){
					case "gc":
						if (!target.roles.cache.has(GCRole)) {
							target.roles.add(GCRole)
							await i.editReply({content: `Assigned ${target}, the gc role.`})
						} else {
							await i.editReply({content: 'Unable to assign GC role, Reason: \`the user already have that role.\`'})
						}
				}
			}
		}
	})
