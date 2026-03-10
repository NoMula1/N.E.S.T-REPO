/* eslint-disable import/no-named-as-default */
/* eslint-disable stylistic/semi */
import { client } from "../../../Core";
import FastFlag from "../../../schemas/FastFlag";
import PostTemplates from "../../../schemas/PostTemplates";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Channel, ChannelType, Colors, EmbedBuilder, TextChannel } from "discord.js";
import { Log } from "../../../utils/logging";


async function CheckPosts() {
	const flag = await FastFlag.findOne({ refName: "DoAutoApprovalForPostCreationBacklog" });
	if (flag?.enabled) {
		await PostTemplates.find({ approved: false, jobType: { $ne: "SELLING" } }).then(async (posts) => {

			if (posts.length < 79) return;

			posts.forEach(async (post) => {
				await post.updateOne({ approved: true })
			});

			const channel = client.channels.cache.find((c: Channel) =>
				c.type === ChannelType.GuildText && c.name.toLowerCase().includes("market-chat")
			) as TextChannel;

			const embed = new EmbedBuilder()
				.setDescription(`The post backlog limit has been reached, automatically approved all non-selling posts`)
				.setColor(Colors.DarkAqua);

			const p = posts.map((p, i) => `${i + 1}: **${p._id}**`);

			for (let i = 0; i < p.length; i += 20) {

				const chunk = p.slice(i, i + 20);
				embed.addFields({
					name: `Approved Posts ${Math.floor(i / 20) + 1}`,
					value: chunk.join('\n')
				});
			}
			const actionrow = new ActionRowBuilder<ButtonBuilder>()
				.addComponents([
					new ButtonBuilder()
						.setCustomId("query_post")
						.setLabel("Get Post From ID")
						.setStyle(ButtonStyle.Success)
				])
			await channel.send({
				embeds: [embed],
				components: [actionrow]
			}).catch(err => Log.error("AutomaticPostBacklog " + err))
		})

	}
}

setInterval(CheckPosts, 80 * 1000) 