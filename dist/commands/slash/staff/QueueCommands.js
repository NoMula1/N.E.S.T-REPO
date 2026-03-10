"use strict";
/* eslint-disable stylistic/semi */
/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/no-named-as-default */
/* eslint-disable @typescript-eslint/no-unused-vars */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultQueueInterfaceRows = void 0;
exports.attemptRegeneration = attemptRegeneration;
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const PostTemplates_1 = __importDefault(require("../../../schemas/PostTemplates"));
const FastFlag_1 = __importDefault(require("../../../schemas/FastFlag"));
const queue_1 = require("../../../utils/queue");
const PostButton_1 = require("../../../events/market/PostButton");
const logging_1 = require("../../../utils/logging");
const BitwiseTagHelpers_1 = require("../../../utils/BitwiseTagHelpers");
exports.defaultQueueInterfaceRows = [
    new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId('qi-accept')
        .setLabel('Accept')
        .setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder()
        .setCustomId('qi-reject')
        .setLabel('Reject')
        .setStyle(discord_js_1.ButtonStyle.Danger)),
    new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId('qi-template-release')
        .setLabel('Release To Queue')
        .setStyle(discord_js_1.ButtonStyle.Danger)),
    new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder().addOptions((0, BitwiseTagHelpers_1.tagGroupAsOptions)())
        .setCustomId('tag-group-select')
        .setPlaceholder("Select Post Tags")),
    new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder()
        .setCustomId('qi-quick-reject')
        .setPlaceholder('Quick-Reject')
        .addOptions(new discord_js_1.StringSelectMenuOptionBuilder()
        .setLabel('A.1 - General Hiring Posts')
        .setDescription('General Hiring Post Rules')
        .setValue('a-1'), new discord_js_1.StringSelectMenuOptionBuilder()
        .setLabel('A.2 - Client-Freelancer Agreement')
        .setDescription('Post does not include Client-Freelancer agreement')
        .setValue('a-2'), new discord_js_1.StringSelectMenuOptionBuilder()
        .setLabel('A.3 - Minimum Payments')
        .setDescription('Post does not adhere to minimum payments')
        .setValue('a-3'), new discord_js_1.StringSelectMenuOptionBuilder()
        .setLabel('B.1 - For-Hire Posts')
        .setDescription('General For-Hire Post Rules')
        .setValue('b-1'), new discord_js_1.StringSelectMenuOptionBuilder()
        .setLabel('B.2 - Portfolios')
        .setDescription('Post must contain a portfolio')
        .setValue('b-2'), new discord_js_1.StringSelectMenuOptionBuilder()
        .setLabel('C.1 - Selling Posts')
        .setDescription('General Selling Post Rules')
        .setValue('c-1'), new discord_js_1.StringSelectMenuOptionBuilder()
        .setLabel('C.2 - Proof of Concept')
        .setDescription('Must provide P.O.C in post')
        .setValue('c-2'), new discord_js_1.StringSelectMenuOptionBuilder()
        .setLabel('D.1 - LF Investor Posts')
        .setDescription('General LF Investor Post Rules')
        .setValue('d-1'), new discord_js_1.StringSelectMenuOptionBuilder()
        .setLabel('E.1 - LF Collab Posts')
        .setDescription('General LF Collab Post Rules')
        .setValue('e-1'), new discord_js_1.StringSelectMenuOptionBuilder()
        .setLabel('G.1 - Scamming & Theft')
        .setDescription('Post contains scamming or theft')
        .setValue('g-1'), new discord_js_1.StringSelectMenuOptionBuilder()
        .setLabel('H.1 - Respectful Content')
        .setDescription('Respectful Content')
        .setValue('h-1'), new discord_js_1.StringSelectMenuOptionBuilder()
        .setLabel('I.1 - Damaging Content')
        .setDescription('Damaging Content')
        .setValue('i-1'), new discord_js_1.StringSelectMenuOptionBuilder()
        .setLabel('J.1 - Post Quality and Coherence')
        .setDescription('Post quality and coherence')
        .setValue('j-1'), new discord_js_1.StringSelectMenuOptionBuilder()
        .setLabel('N/A - Contact Staff')
        .setDescription('For all other issues; direct member to contact marketplace staff for approval')
        .setValue('n-a')))
];
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("queue")
    .setDescription("Manage the post template queue")
    .setExecutor(async (interaction) => {
    var _a;
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    const marketFlag = await FastFlag_1.default.findOne({
        refName: 'ReleaseMarketRevamp',
        enabled: true
    });
    if (!marketFlag) {
        await interaction.reply({
            content: 'This feature is not yet released.',
            ephemeral: true
        });
        return;
    }
    await (0, queue_1.validateAllQueues)();
    const thisSubcommand = interaction.options.getSubcommand();
    switch (thisSubcommand) {
        case 'force_release': {
            const userInfo = await (0, queue_1.getUserInformation)(interaction.user.id);
            if (!userInfo.currentlyViewingPost) {
                await interaction.reply({
                    ephemeral: true,
                    content: 'No viewing post detected. If this is unexpected and the post does not automatically return to the queue, please engage NEST development team.'
                });
                return;
            }
            await interaction.deferReply({
                ephemeral: true
            });
            userInfo.currentlyViewingPost.isQueueServed = false;
            userInfo.currentlyViewingPost.isSuspended = false;
            userInfo.currentlyViewingPost.waitingForApproval = true;
            userInfo.currentlyViewingPost.queueServedTo = undefined;
            await userInfo.currentlyViewingPost.save();
            logging_1.Log.debug(`Released post ${userInfo.currentlyViewingPost._id} back into queue due to market staff request`);
            await interaction.editReply(`Moved \`${userInfo.currentlyViewingPost._id}\` back into queue.`);
            break;
        }
        case 'info': {
            await interaction.deferReply({ ephemeral: true });
            const queue = await PostTemplates_1.default.find({
                waitingForApproval: true,
                $and: [
                    {
                        $or: [
                            {
                                isSuspended: false
                            },
                            {
                                isSuspended: { $exists: false }
                            }
                        ]
                    },
                    {
                        $or: [
                            {
                                isQueueServed: false
                            },
                            {
                                isQueueServed: { $exists: false }
                            }
                        ]
                    }
                ]
            }).sort({
                createdAt: 1
            }).exec();
            if (!queue || queue.length < 1) {
                await interaction.editReply(`The queue is currently empty.`);
                return;
            }
            const oldestInQueue = queue[0];
            const mostRecent = queue[queue.length - 1];
            await interaction.editReply({
                embeds: [
                    new discord_js_1.EmbedBuilder()
                        .setTitle('Post Template Queue Information')
                        .setColor(discord_js_1.Colors.Blurple)
                        .setDescription(`Queue Size: **${(queue.length)} ${(queue.length == 1) ? 'post' : 'posts'}**\n\n`
                        + `The **first** item in the queue was placed **<t:${Math.round(oldestInQueue.updatedAt.getTime() / 1000)}:R>**\n`
                        + `The **last** item in the queue was placed  **<t:${Math.round(mostRecent.updatedAt.getTime() / 1000)}:R>**`)
                ]
            });
            break;
        }
        case 'info_user': {
            const user = (_a = interaction.options.getUser('user')) !== null && _a !== void 0 ? _a : interaction.user;
            if (user !== interaction.user && !interaction.member.guild.roles.cache.find((r) => r.name.toLowerCase() === "marketplace manager")) {
                await interaction.reply({
                    ephemeral: true,
                    content: `Only market managers can check the queue info of user other than themselves.`
                });
                return;
            }
            const uInfo = await (0, queue_1.getUserInformation)(user.id);
            await interaction.reply({
                ephemeral: true,
                embeds: [
                    new discord_js_1.EmbedBuilder()
                        .setTitle(`Information for ${user.username}`)
                        .setDescription(`User currently has **${uInfo.heldPosts}** held (suspended) posts.\n`
                        + `${uInfo.currentlyViewingPost ? `User is currently viewing post **${uInfo.currentlyViewingPost._id}**.` : `User is not viewing any post.`}`)
                ]
            });
            return;
            break;
        }
        case 'serve': {
            const userInfo = await (0, queue_1.getUserInformation)(interaction.user.id);
            if (userInfo.currentlyViewingPost) {
                await interaction.reply({
                    ephemeral: true,
                    content: 'You already have a queued post. Please deal with it or let it expire before running this command again.'
                });
                return;
            }
            const generation = await attemptGeneration(interaction);
            if (!generation) {
                return;
            }
            const nextInQueue = generation[0];
            const embed = generation[1];
            await interaction.reply({
                ephemeral: true,
                content: `**${await (0, queue_1.getQueueLength)()}** post(s) remaining in queue • <@${nextInQueue.userID}> ~ ${nextInQueue._id}`,
                embeds: [
                    embed
                ],
                components: exports.defaultQueueInterfaceRows
            });
            break;
        }
        default: {
            await interaction.reply({
                ephemeral: true,
                content: 'This command option has not been set up yet.'
            });
            break;
        }
    }
})
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.AssistantModerator,
    HasRole: ['1192313383563821086']
})
    .addSubcommand(cmd => cmd.setName('force_release')
    .setDescription('Forcefully release your held post back into queue'))
    .addSubcommand(cmd => cmd.setName('info')
    .setDescription('Get queue information'))
    .addSubcommand(cmd => cmd.setName('info_user')
    .setDescription('Get queue information about a user')
    .addUserOption(userOption => userOption.setName('user')
    .setDescription('The user to check information on')))
    .addSubcommand(cmd => cmd.setName('serve')
    .setDescription('Start serving post templates from the queue'));
async function attemptRegeneration(interaction) {
    var _a;
    const nextInQueue = await (0, queue_1.getNextInQueue)();
    if (!nextInQueue) {
        const configs = {
            ephemeral: true,
            embeds: [
                new discord_js_1.EmbedBuilder()
                    .setTitle('Unable to serve')
                    .setDescription(`You've reached the end of the queue. Click refresh at a later date.`)
                    .setColor("Red")
                    .setTimestamp()
            ],
            components: [
                new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
                    .setCustomId('qi-refresh')
                    .setLabel('Refresh')
                    .setStyle(discord_js_1.ButtonStyle.Primary))
            ]
        };
        if (interaction.isButton()) {
            await interaction.update(configs);
        }
        else if (interaction.isStringSelectMenu()) {
            await interaction.update(configs);
        }
        else if (interaction.isModalSubmit()) {
            await interaction.editReply(configs);
        }
    }
    else {
        await (0, queue_1.claimOwnership)(nextInQueue._id, interaction);
        const user = interaction.client.users.cache.get(nextInQueue.userID);
        if (!user) {
            await nextInQueue.deleteOne();
            return attemptRegeneration(interaction);
        }
        const preEmbed = await (0, PostButton_1.generateEmbed)(nextInQueue, user, interaction.guild, true);
        const matches = (_a = preEmbed.PostEmbed.data.description) === null || _a === void 0 ? void 0 : _a.matchAll(/\[(?<foundtext>[^\]]+)\]\((?<link>[^)]+)\)/g);
        let embed;
        if (matches) {
            let desc = "This post has been found to contain hidden links a list is provided here:\n";
            for (const match of matches) {
                if (match && match.groups && match.groups.link) {
                    desc += `[${match.groups.foundtext}](${match.groups.link})\n`;
                }
            }
            embed = new discord_js_1.EmbedBuilder().setDescription(desc);
        }
        const replyToEdit = {
            content: `**${await (0, queue_1.getQueueLength)()}** post(s) remaining in queue • <@${nextInQueue.userID}> ~ ${nextInQueue._id}`,
            embeds: [
                preEmbed.PostEmbed
            ],
            components: exports.defaultQueueInterfaceRows
        };
        if (interaction.isButton()) {
            await interaction.update(replyToEdit);
        }
        else if (interaction.isStringSelectMenu()) {
            await interaction.update(replyToEdit);
        }
        else if (interaction.isModalSubmit()) {
            await interaction.editReply(replyToEdit);
        }
        /*
        await interaction.editReply({
            content: `**${await getQueueLength()}** post(s) remaining in queue • <@${nextInQueue.userID}> ~ ${nextInQueue._id}`,
            embeds: [
                preEmbed as any
            ],
            components: defaultQueueInterfaceRows
        });
        */
    }
}
async function attemptGeneration(interaction) {
    var _a;
    const nextInQueue = await (0, queue_1.getNextInQueue)();
    if (!nextInQueue) {
        await interaction.reply({
            content: 'There are no more posts in the queue.',
            ephemeral: true
        });
        return;
    }
    await (0, queue_1.claimOwnership)(nextInQueue._id, interaction);
    const user = (_a = interaction.client.users.cache.get(nextInQueue.userID)) !== null && _a !== void 0 ? _a : await interaction.client.users.fetch(nextInQueue.userID);
    if (!user) {
        await nextInQueue.deleteOne();
        return attemptGeneration(interaction);
    }
    const preEmbed = await (0, PostButton_1.generateEmbed)(nextInQueue, user, interaction.guild, true);
    return [nextInQueue, preEmbed.PostEmbed];
}
