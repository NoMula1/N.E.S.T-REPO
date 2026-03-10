import { GuildMember, Role } from "discord.js"
import { CommandExecutor, PermissionLevel, RoleIDS } from "../../../utils/CommandExecutor"
import { Log } from "../../../utils/logging"
const lineReader = require("line-reader")

export default new CommandExecutor()
	.setName("scramble")
	.setDescription("Scramble someone's nickname!")
	.setBasePermission({
		Level: PermissionLevel.None,
	})
	.addUserOption(opt =>
		opt
			.setName("user")
			.setDescription("[ADMIN ONLY] Scramble another user's nickname!")
			.setRequired(false)
	)
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) return
		const member = interaction.options.getMember("user") || interaction.member

		//check for perms if non - admin
		if (interaction.guild.roles.cache.find((r: Role) => r.id === RoleIDS.Administrator)?.position! > interaction.member.roles.highest.position && member) {
			await interaction.reply({
				content: "You can only run this command on yourself!",
				ephemeral: true
			})
			return
		}
		const userOldName = member.nickname || member.user.globalName
		const userNewName = await generateName()
		// Set the nickname
		member.setNickname(userNewName, "The funnies").catch((err: Error) => Log.error("Uh oh!\n" + err))
		await interaction.reply(`Scrambled username, you are now ${userNewName}!!`)

		// Unscramble the name after 30 seconds, nice
		unscrambleName(member, userOldName!, userNewName)

	})

/** Returns an array of entries in the dictionary.
 *  @returns {Promise<string[]>}
 */
async function readDictionary(name: string): Promise<string[]> {


	return new Promise((resolve, reject) => {
		const result: string[] = []

		lineReader.eachLine(`./content/dicts/${name}.txt`, (line: string, last: boolean) => {
			result.push(line)
			if (last) {
				if (result.length == 0) result.push("uh oh!")
				resolve(result)
			}
		})
	})
}

function getRandomInt(max: number): number {
	return Math.floor(Math.random() * max)
}

/** Generates and returns a new funny name. */
async function generateName(): Promise<string> {
	const nouns = await readDictionary("randomNouns")
	const verbs = await readDictionary("randomVerbs")
	const parts: string[] = []
	for (let i = 0; i < getRandomInt(2) + 1; i++) {
		const newVerb = verbs[getRandomInt(verbs.length)]
		// Check if unique
		//if (!parts.some((other) => other === newVerb))
		parts[i] = newVerb
		//else
		// Pick another
		//    i--
	}
	parts.push(nouns[getRandomInt(nouns.length)])
	if (parts.join(" ").length > 32) {
		return generateName()
	}
	return parts.join(" ")
}

/** Removes the user's scramble after a certain amount of time */
function unscrambleName(member: GuildMember, oldName: string, newName: string) {
	setTimeout(() => {
		//const entry = affectedUsers.find((other) => other[0].id === id)
		// TODO: Use the entry
		// affectedUsers[user] = null

		// Do not change nickname if the user has changed their username from the scrambled name
		if (member.nickname !== newName) return
		member.setNickname(oldName, "Reverse scramble action").catch((err: Error) => { Log.error(`Error in scramble.ts\n` + err) })
	}, 30000)
}