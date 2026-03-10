import { Log } from "../../utils/logging";
import mongoose from "mongoose";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ChannelType,
	Client,
	Colors,
	EmbedBuilder,
	Events,
	Interaction,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
	StringSelectMenuOptionBuilder,
	TextChannel,
	ThreadAutoArchiveDuration,
} from "discord.js";
import { EventOptions } from "../../utils/RegisterEvents";
import { addBwTag, searchPostsWithTags, stripBwTag, TagAssociation, tagGroupAsOptions } from "../../utils/BitwiseTagHelpers";
import TagThread from "../../schemas/TagThread";
import { client } from "../../Core";
import Post from "../../schemas/Post";
import { generateEmbed } from "./PostButton";

const globalCooldown: Map<string, number> = new Map();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function handleButtonInteraction(i: ButtonInteraction) {
	switch (i.customId) {
		case "post-search-execute": {
			if (globalCooldown.get(i.user.id) && Date.now() - globalCooldown.get(i.user.id)! <= 120_000) {
				await i.reply({
					ephemeral: true,
					content: `You are still on cooldown!`,
				});
				return;
			}

			let tagBits = BigInt(parseInt(i.message.content.split("|")[0]));
			if (!tagBits || isNaN(Number(tagBits))) return;

			const foundThread = await TagThread.findOne({
				creatorId: i.user.id,
			});
			if (foundThread) {
				if (await client.channels.fetch(foundThread.channelId).catch(() => { })) {
					await i.reply({
						ephemeral: true,
						content: `You already have an open search thread.`,
					});
					return;
				} else {
					await foundThread.deleteOne();
				}
			}

			await i.deferUpdate();

			const foundChannel = client.channels.cache.find(
				(c) => c.type === ChannelType.GuildText && c.name === "search-channel"
			);
			if (!foundChannel) return;

			const openedThread = await (foundChannel as TextChannel).threads.create({
				name: `search-${i.user.username}-${tagBits}`,
				autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
				type: ChannelType.PrivateThread,
				reason: `Post search execution tagbits ${tagBits}`,
			});
			await openedThread.join();

			await TagThread.create({
				creatorId: i.user.id,
				channelId: openedThread.id,
				tagBits: tagBits.toString(), // Save as string for MongoDB compatibility
			});

			const algorithmResults = await searchPostsWithTags(tagBits);
			console.log(algorithmResults);
			if (!algorithmResults || algorithmResults.length < 1) return;
			const endPosts = [];

			let index = 0;
			while (endPosts.length < 20 && index <= algorithmResults.length - 1) {
				console.log(`index ${index}`);
				const thisTemplate = algorithmResults[index];
				const foundRelatedPost = await Post.findOne({
					postTemplateReference: thisTemplate.post._id,
				});
				console.log("pass find");
				if (foundRelatedPost && client.users.cache.get(foundRelatedPost.userID)) {
					console.log("pass check");
					(thisTemplate as any).user = client.users.cache.get(foundRelatedPost.userID);
					endPosts.push(thisTemplate);
				}
				index += 1;
			}

			for (const thisPost of endPosts) {
				await openedThread.send({
					embeds: [
						(
							await generateEmbed(thisPost.post, (thisPost as any).user!, i.guild!, true)
						).PostEmbed,
					],
				});
				await sleep(1500);
			}

			await openedThread.members.add(i.user);
			await openedThread.send(`<@${i.user.id}>`);

			await i.editReply({
				content: `<#${openedThread.id}>`,
				embeds: [],
				components: [],
			});

			break;
		}
	}
}

async function handleSelectMenuInteraction(i: StringSelectMenuInteraction) {
	switch (i.customId) {
		case "post-search-group": {
			const tagGroup: any = i.values[0]!;
			await (i as any).update({
				content: i.message.content.split("|")[0] + "|" + tagGroup,
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId("post-search-tag-back")
							.setLabel(`Back`)
							.setStyle(ButtonStyle.Success)
					),
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
						new StringSelectMenuBuilder()
							.setCustomId(`post-search-tag-group-${tagGroup}`)
							.setMinValues(0)
							.setMaxValues(Object.keys(TagAssociation[tagGroup]).length)
							.addOptions(
								Object.keys(TagAssociation[tagGroup]).map((tagName) =>
									new StringSelectMenuOptionBuilder()
										.setLabel(tagName)
										.setValue(tagName)
										.setDescription(tagName)
										.setDefault(
											(BigInt(parseInt(i.message.content.split("|")[0])) &
												BigInt(TagAssociation[tagGroup][tagName])) !==
											BigInt(0)
										)
								)
							)
					),
				],
			});
			break;
		}
	}

	if (i.customId.startsWith("post-search-tag-group")) {
		const tagValues = i.values;
		const currentSelectedTagBits = BigInt(parseInt(i.message.content.split("|")[0]));
		let newTagBits = currentSelectedTagBits;
		const currentTagGroup = i.message.content.split("|")[1];

		for (const [tempTagName, tempTagBits] of (Object.entries((TagAssociation as any)[currentTagGroup])) as any) {
			let found = false;
			for (const val of tagValues) {
				if (tempTagName === val) {
					found = true;
					break;
				}
			}

			if ((currentSelectedTagBits & BigInt(tempTagBits)) !== BigInt(0)) {
				if (!found) {
					newTagBits = stripBwTag(newTagBits, BigInt(tempTagBits));
				}
			} else {
				if (found) {
					newTagBits = addBwTag(newTagBits, BigInt(tempTagBits));
				}
			}
		}

		const rawTemplateTags = newTagBits;
		const finalPostTags = [];
		for (const tagGroup in TagAssociation) {
			const association = (TagAssociation as any)[tagGroup];
			for (const [tagName, tagBitValue] of Object.entries(association) as any) {
				if ((rawTemplateTags & BigInt(tagBitValue)) !== BigInt(0)) {
					finalPostTags.push(`[${tagGroup}] ${tagName}`);
				}
			}
		}

		await i.update({
			content: `${newTagBits.toString()}|N`,
			embeds: [
				new EmbedBuilder()
					.setTitle("Post Query")
					.setColor(Colors.Blurple)
					.setDescription(
						`You can search for posts using the below select menus. When you're ready to search, press **Search**, and I will open a new thread under that message.\n\nSelected Tags:\n\`\`\`\n- ${finalPostTags.join(
							"\n- "
						)}\n\`\`\``
					)
					.setFooter({ text: `Ensure you only find the posts you're looking for with our staff-selected Market Tags` }),
			],
			components: [
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId("post-search-execute")
						.setLabel("Search")
						.setStyle(ButtonStyle.Secondary)
				),
				new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
					new StringSelectMenuBuilder()
						.addOptions(tagGroupAsOptions())
						.setCustomId("post-search-group")
						.setPlaceholder("Choose a tag group")
				),
			],
		});
	}
}

export default {
	name: Events.InteractionCreate,
	once: false,
	async execute(_: EventOptions, interaction: Interaction) {
		if (!interaction.inCachedGuild()) return;
		if (interaction.isButton()) {
			return await handleButtonInteraction(interaction);
		} else if (interaction.isStringSelectMenu()) {
			return await handleSelectMenuInteraction(interaction);
		}
	},
};
