import { AttachmentBuilder, ChatInputCommandInteraction, EmbedBuilder, GuildMember, Message, PermissionFlagsBits, PermissionsBitField, TextChannel } from "discord.js"
import { errorEmbed, sendModLogs } from "../../../utils/GenUtils"
import fs from "fs"
import os from "os"
import { config } from "../../../utils/config"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"
import { Scope } from "../../../bootstrap/GlobalScope"

export default new CommandExecutor()
	.setName("purge")
	.setDescription("Purge messages.")
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
	.setBasePermission({
		Level: PermissionLevel.AssistantModerator,
		Scope: Scope.Admin
	})
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }

		const subCommand = interaction.options.getSubcommand()
		const amount = interaction.options.getNumber("amount") || 1
		const user = interaction.options.getUser("user")

		switch (subCommand) {
			case "all":

				if (amount < 0) { interaction.reply(errorEmbed("Invalid number!")); return }

				await deleteMsgs(amount, interaction.member!, interaction, null)
				break
			case "bots":
				await deleteMsgs(amount, interaction.member!, interaction, (msg: Message) => {
					if (!msg.author.bot) return false
					return true
				})
				break
			case "user":
				await deleteMsgs(amount, interaction.member!, interaction, (msg: Message) => {
					if (!user) return
					if (msg.author.id !== user.id) return false
					return true
				})
				break
			case "images": {
				await deleteMsgs(amount, interaction.member!, interaction, (msg: Message) => {
					for (const attachment of msg.attachments) {
						const attachmentURL = attachment[1].url
						if (attachmentURL.endsWith('.png') || attachmentURL.endsWith('.jpg') || attachmentURL.endsWith('.jpeg')) return true
					}
					return false
				})
				break
			}

		}
	})
	.addSubcommand(subCommand =>
		subCommand
			.setName("all")
			.setDescription("Purge all messages.")
			.addNumberOption(opt =>
				opt
					.setName("amount")
					.setDescription("Enter the amount of messages you'd like to purge.")
					.setRequired(true)
			)
	)
	.addSubcommand(subCommand =>
		subCommand
			.setName("bot")
			.setDescription("Purge bot messages.")
			.addNumberOption(opt =>
				opt
					.setName("amount")
					.setDescription("Enter the amount of messages you'd like to purge.")
					.setRequired(true)
			)
	)
	.addSubcommand(subCommand =>
		subCommand
			.setName("user")
			.setDescription("Purge specific user's messages.")
			.addUserOption(opt =>
				opt
					.setName("user")
					.setDescription("Select a user's message you'd like pruged.")
					.setRequired(true)
			)
			.addNumberOption(opt =>
				opt
					.setName("amount")
					.setDescription("Enter the amount of messages you'd like to purge.")
					.setRequired(true)
			)
	)
	.addSubcommand(subCommand =>
		subCommand
			.setName("attatchments")
			.setDescription("Purge all messages with an attatchment.")
			.addNumberOption(opt =>
				opt
					.setName("number")
					.setDescription("Enter the amount of messages you'd like to purge.")
					.setRequired(true)
			)
	)


async function deleteMsgs(count: number, member: GuildMember, interaction: ChatInputCommandInteraction, filter: Function | null) {
	const channel: TextChannel = interaction.channel as TextChannel

	if (count > 500) {
		await interaction.reply(errorEmbed(`Purge amount cannot be over 500.`))
		return
	}

	count = count += 1

	let msgsDeletedSize = -1
	const messagesDeleted: Array<string> = []

	if (count <= 100) {
		try {
			await channel.bulkDelete(await getMessagesWithFilter(count, channel, filter) || count, true).then(messages => {
				msgsDeletedSize += messages.size
				for (const msgarray of messages) {
					try {
						const msg = msgarray[1] as Message
						if (!msg || !msg.deletable) continue
						messagesDeleted.push(`${msg.author.username} | ${msg.content}`)
					} catch (err) {
						console.log(err)
					}
				}
			})
			const successEmbed = new EmbedBuilder()
				.setDescription(`${config.successEmoji} Successfully deleted ${msgsDeletedSize} messages`)
				.setColor("Blurple")
			await interaction.reply({ embeds: [successEmbed] })
		} catch (err) {
			console.log(err)
			await interaction.reply(errorEmbed(`Something went wrong!\n\n\`CHECK CONSOLE\``))
			return
		}
	} else {
		let timesToLoop = Math.floor(count / 100)
		const remainder = count % 100

		while (timesToLoop >= 1) {
			timesToLoop -= 1

			const filteredMsgs = await getMessagesWithFilter(100, channel, filter)

			if (filter && filteredMsgs) {
				msgsDeletedSize += filteredMsgs.length
				for (const msg of filteredMsgs) {
					try {
						if (!msg || !msg.deletable) continue
						messagesDeleted.push(`${msg.author.username}# | ${msg.content}`)
					} catch (err) { }
				}
			} else {
				await channel.messages.fetch({ limit: 100 }).then(async messages => {
					msgsDeletedSize += messages.size
					for (const msgarray of messages) {
						try {
							const msg = msgarray[1] as Message
							if (!msg || !msg.deletable) continue
							messagesDeleted.push(`${msg.author.username} | ${msg.content}`)
						} catch (err) { }
					}
				})
			}

			try {
				await channel.bulkDelete(filteredMsgs || 100, true)
			} catch (err) {
				console.log(err)
				await interaction.reply(errorEmbed(`Something went wrong!\n\n\`CHECK CONSOLE\``))
				return
			}
		}

		const filteredMsgs = await getMessagesWithFilter(remainder, channel, filter)

		if (filter && filteredMsgs) {
			msgsDeletedSize += filteredMsgs.length
			for (const msg of filteredMsgs) {
				try {
					if (!msg || !msg.deletable) continue
					messagesDeleted.push(`${msg.author.username} | ${msg.content}`)
				} catch (err) { }
			}
		} else {
			await channel.messages.fetch({ limit: remainder, cache: true }).then(async messages => {
				msgsDeletedSize += messages.size
				for (const msgarray of messages) {
					try {
						const msg = msgarray[1] as Message
						if (!msg || !msg.deletable) continue
						messagesDeleted.push(`${msg.author.username} | ${msg.content}`)
					} catch (err) {
						console.log(err)
					}
				}
			})
		}

		try {
			await channel.bulkDelete(await getMessagesWithFilter(remainder, channel, filter) || remainder, true)
			const successEmbed = new EmbedBuilder()
				.setDescription(`${config.successEmoji} Successfully deleted ${msgsDeletedSize} messages`)
				.setColor("Blurple")
			await interaction.reply({ embeds: [successEmbed] })
		} catch (err) {
			console.log(err)
			await interaction.reply(errorEmbed(`Something went wrong!\n\n\`CHECK CONSOLE\``))
			return
		}
	}

	if (msgsDeletedSize === 0) return
	sendModLogs({ guild: channel.guild, mod: member!, action: "Purge", attachments: [await generateAttachmentFileFromArray(messagesDeleted)] }, { title: "Channel purged", actionInfo: `${msgsDeletedSize} messages were deleted` })
}

async function generateAttachmentFileFromArray(array: Array<string>) {
	const fileContent = array.join('\n')
	fs.writeFileSync(`${os.tmpdir}/purgeCMD.txt`, fileContent)
	const att = new AttachmentBuilder(`${os.tmpdir}/purgeCMD.txt`)
	return att
}

async function getMessagesWithFilter(count: number, channel: TextChannel, filter: Function | null): Promise<Message<boolean>[] | null> {

	if (!filter) return null

	const messagesToDelete: Array<Message> = []

	while (messagesToDelete.length < count) {
		await channel.messages.fetch({ limit: 100 }).then(async messages => {
			for (const msgarray of messages) {
				const msg = msgarray[1] as Message
				if (!msg || !msg.deletable) continue
				if (messagesToDelete.length >= count) return
				if (!filter(msg)) continue
				messagesToDelete.push(msg)
			}
		})
	}

	return messagesToDelete

}