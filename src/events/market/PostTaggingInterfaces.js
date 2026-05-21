"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const BitwiseTagHelpers_1 = require("../../utils/BitwiseTagHelpers");
const TagThread_1 = __importDefault(require("../../schemas/TagThread"));
const Core_1 = require("../../Core");
const Post_1 = __importDefault(require("../../schemas/Post"));
const PostButton_1 = require("./PostButton");
const globalCooldown = new Map();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function handleButtonInteraction(i) {
    switch (i.customId) {
        case "post-search-execute": {
            if (globalCooldown.get(i.user.id) && Date.now() - globalCooldown.get(i.user.id) <= 120000) {
                await i.reply({
                    ephemeral: true,
                    content: `You are still on cooldown!`,
                });
                return;
            }
            let tagBits = BigInt(parseInt(i.message.content.split("|")[0]));
            if (!tagBits || isNaN(Number(tagBits)))
                return;
            const foundThread = await TagThread_1.default.findOne({
                creatorId: i.user.id,
            });
            if (foundThread) {
                if (await Core_1.client.channels.fetch(foundThread.channelId).catch(() => { })) {
                    await i.reply({
                        ephemeral: true,
                        content: `You already have an open search thread.`,
                    });
                    return;
                }
                else {
                    await foundThread.deleteOne();
                }
            }
            await i.deferUpdate();
            const foundChannel = Core_1.client.channels.cache.find((c) => c.type === discord_js_1.ChannelType.GuildText && c.name === "search-channel");
            if (!foundChannel)
                return;
            const openedThread = await foundChannel.threads.create({
                name: `search-${i.user.username}-${tagBits}`,
                autoArchiveDuration: discord_js_1.ThreadAutoArchiveDuration.OneHour,
                type: discord_js_1.ChannelType.PrivateThread,
                reason: `Post search execution tagbits ${tagBits}`,
            });
            await openedThread.join();
            await TagThread_1.default.create({
                creatorId: i.user.id,
                channelId: openedThread.id,
                tagBits: tagBits.toString(), // Save as string for MongoDB compatibility
            });
            const algorithmResults = await (0, BitwiseTagHelpers_1.searchPostsWithTags)(tagBits);
            console.log(algorithmResults);
            if (!algorithmResults || algorithmResults.length < 1)
                return;
            const endPosts = [];
            let index = 0;
            while (endPosts.length < 20 && index <= algorithmResults.length - 1) {
                console.log(`index ${index}`);
                const thisTemplate = algorithmResults[index];
                const foundRelatedPost = await Post_1.default.findOne({
                    postTemplateReference: thisTemplate.post._id,
                });
                console.log("pass find");
                if (foundRelatedPost && Core_1.client.users.cache.get(foundRelatedPost.userID)) {
                    console.log("pass check");
                    thisTemplate.user = Core_1.client.users.cache.get(foundRelatedPost.userID);
                    endPosts.push(thisTemplate);
                }
                index += 1;
            }
            for (const thisPost of endPosts) {
                await openedThread.send({
                    embeds: [
                        (await (0, PostButton_1.generateEmbed)(thisPost.post, thisPost.user, i.guild, true)).PostEmbed,
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
async function handleSelectMenuInteraction(i) {
    switch (i.customId) {
        case "post-search-group": {
            const tagGroup = i.values[0];
            await i.update({
                content: i.message.content.split("|")[0] + "|" + tagGroup,
                components: [
                    new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
                        .setCustomId("post-search-tag-back")
                        .setLabel(`Back`)
                        .setStyle(discord_js_1.ButtonStyle.Success)),
                    new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder()
                        .setCustomId(`post-search-tag-group-${tagGroup}`)
                        .setMinValues(0)
                        .setMaxValues(Object.keys(BitwiseTagHelpers_1.TagAssociation[tagGroup]).length)
                        .addOptions(Object.keys(BitwiseTagHelpers_1.TagAssociation[tagGroup]).map((tagName) => new discord_js_1.StringSelectMenuOptionBuilder()
                        .setLabel(tagName)
                        .setValue(tagName)
                        .setDescription(tagName)
                        .setDefault((BigInt(parseInt(i.message.content.split("|")[0])) &
                        BigInt(BitwiseTagHelpers_1.TagAssociation[tagGroup][tagName])) !==
                        BigInt(0))))),
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
        for (const [tempTagName, tempTagBits] of (Object.entries(BitwiseTagHelpers_1.TagAssociation[currentTagGroup]))) {
            let found = false;
            for (const val of tagValues) {
                if (tempTagName === val) {
                    found = true;
                    break;
                }
            }
            if ((currentSelectedTagBits & BigInt(tempTagBits)) !== BigInt(0)) {
                if (!found) {
                    newTagBits = (0, BitwiseTagHelpers_1.stripBwTag)(newTagBits, BigInt(tempTagBits));
                }
            }
            else {
                if (found) {
                    newTagBits = (0, BitwiseTagHelpers_1.addBwTag)(newTagBits, BigInt(tempTagBits));
                }
            }
        }
        const rawTemplateTags = newTagBits;
        const finalPostTags = [];
        for (const tagGroup in BitwiseTagHelpers_1.TagAssociation) {
            const association = BitwiseTagHelpers_1.TagAssociation[tagGroup];
            for (const [tagName, tagBitValue] of Object.entries(association)) {
                if ((rawTemplateTags & BigInt(tagBitValue)) !== BigInt(0)) {
                    finalPostTags.push(`[${tagGroup}] ${tagName}`);
                }
            }
        }
        await i.update({
            content: `${newTagBits.toString()}|N`,
            embeds: [
                new discord_js_1.EmbedBuilder()
                    .setTitle("Post Query")
                    .setColor(discord_js_1.Colors.Blurple)
                    .setDescription(`You can search for posts using the below select menus. When you're ready to search, press **Search**, and I will open a new thread under that message.\n\nSelected Tags:\n\`\`\`\n- ${finalPostTags.join("\n- ")}\n\`\`\``)
                    .setFooter({ text: `Ensure you only find the posts you're looking for with our staff-selected Market Tags` }),
            ],
            components: [
                new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
                    .setCustomId("post-search-execute")
                    .setLabel("Search")
                    .setStyle(discord_js_1.ButtonStyle.Secondary)),
                new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder()
                    .addOptions((0, BitwiseTagHelpers_1.tagGroupAsOptions)())
                    .setCustomId("post-search-group")
                    .setPlaceholder("Choose a tag group")),
            ],
        });
    }
}
exports.default = {
    name: discord_js_1.Events.InteractionCreate,
    once: false,
    async execute(_, interaction) {
        if (!interaction.inCachedGuild())
            return;
        if (interaction.isButton()) {
            return await handleButtonInteraction(interaction);
        }
        else if (interaction.isStringSelectMenu()) {
            return await handleSelectMenuInteraction(interaction);
        }
    },
};
