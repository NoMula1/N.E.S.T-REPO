import https from "https"
import { EmbedBuilder } from "discord.js"
import { CommandExecutor, PermissionLevel } from "../../../utils/CommandExecutor"

function random(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1) + min)
}

export default new CommandExecutor()
	.setName("frog")
	.setDescription("Get pictures of frogs!")
	.setBasePermission({
		Level: PermissionLevel.None,
	})
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild) return

		const options = {
			hostname: 'api.imgur.com',
			path: `/3/gallery/search/?q=frog`,
			headers: { 'Authorization': 'Client-ID 3aa2956255ee1bf' },
			method: 'GET'
		}

		const req = https.request(options, function (res) {
			let bdy = ""
			res.on('data', function (d) {
				bdy += d
			})

			res.on('end', function () {
				const json = JSON.parse(bdy)
				const rand = random(0, json.data.length)
				const randdata = json.data[rand]
				const query = json.data[rand].link
				const embed = new EmbedBuilder()
				if (query !== '')
					embed.setDescription(`Source: ${query}`)
				embed.setColor('#5c10bd')
				embed.setImage(randdata.images[0].link)
				if (randdata.account_url !== '')
					embed.setFooter({ text: `By ${randdata.account_url}` })
				interaction.reply({ embeds: [embed] })
			})
		})

		req.on('error', function () {
			interaction.reply("Sorry, there was an issue processing your request!")
		})

		req.end()
	})