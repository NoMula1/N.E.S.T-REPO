"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const GenUtils_1 = require("../../../utils/GenUtils");
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const config_1 = require("../../../utils/config");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const GlobalScope_1 = require("../../../bootstrap/GlobalScope");
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("purge")
    .setDescription("Purge messages.")
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageMessages)
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.AssistantModerator,
    Scope: GlobalScope_1.Scope.Admin
})
    .setExecutor(async (interaction) => {
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    const subCommand = interaction.options.getSubcommand();
    const amount = interaction.options.getNumber("amount") || 1;
    const user = interaction.options.getUser("user");
    switch (subCommand) {
        case "all":
            if (amount < 0) {
                interaction.reply((0, GenUtils_1.errorEmbed)("Invalid number!"));
                return;
            }
            await deleteMsgs(amount, interaction.member, interaction, null);
            break;
        case "bots":
            await deleteMsgs(amount, interaction.member, interaction, (msg) => {
                if (!msg.author.bot)
                    return false;
                return true;
            });
            break;
        case "user":
            await deleteMsgs(amount, interaction.member, interaction, (msg) => {
                if (!user)
                    return;
                if (msg.author.id !== user.id)
                    return false;
                return true;
            });
            break;
        case "images": {
            await deleteMsgs(amount, interaction.member, interaction, (msg) => {
                for (const attachment of msg.attachments) {
                    const attachmentURL = attachment[1].url;
                    if (attachmentURL.endsWith('.png') || attachmentURL.endsWith('.jpg') || attachmentURL.endsWith('.jpeg'))
                        return true;
                }
                return false;
            });
            break;
        }
    }
})
    .addSubcommand(subCommand => subCommand
    .setName("all")
    .setDescription("Purge all messages.")
    .addNumberOption(opt => opt
    .setName("amount")
    .setDescription("Enter the amount of messages you'd like to purge.")
    .setRequired(true)))
    .addSubcommand(subCommand => subCommand
    .setName("bot")
    .setDescription("Purge bot messages.")
    .addNumberOption(opt => opt
    .setName("amount")
    .setDescription("Enter the amount of messages you'd like to purge.")
    .setRequired(true)))
    .addSubcommand(subCommand => subCommand
    .setName("user")
    .setDescription("Purge specific user's messages.")
    .addUserOption(opt => opt
    .setName("user")
    .setDescription("Select a user's message you'd like pruged.")
    .setRequired(true))
    .addNumberOption(opt => opt
    .setName("amount")
    .setDescription("Enter the amount of messages you'd like to purge.")
    .setRequired(true)))
    .addSubcommand(subCommand => subCommand
    .setName("attatchments")
    .setDescription("Purge all messages with an attatchment.")
    .addNumberOption(opt => opt
    .setName("number")
    .setDescription("Enter the amount of messages you'd like to purge.")
    .setRequired(true)));
async function deleteMsgs(count, member, interaction, filter) {
    const channel = interaction.channel;
    if (count > 500) {
        await interaction.reply((0, GenUtils_1.errorEmbed)(`Purge amount cannot be over 500.`));
        return;
    }
    count = count += 1;
    let msgsDeletedSize = -1;
    const messagesDeleted = [];
    if (count <= 100) {
        try {
            await channel.bulkDelete(await getMessagesWithFilter(count, channel, filter) || count, true).then(messages => {
                msgsDeletedSize += messages.size;
                for (const msgarray of messages) {
                    try {
                        const msg = msgarray[1];
                        if (!msg || !msg.deletable)
                            continue;
                        messagesDeleted.push(`${msg.author.username} | ${msg.content}`);
                    }
                    catch (err) {
                        console.log(err);
                    }
                }
            });
            const successEmbed = new discord_js_1.EmbedBuilder()
                .setDescription(`${config_1.config.successEmoji} Successfully deleted ${msgsDeletedSize} messages`)
                .setColor("Blurple");
            await interaction.reply({ embeds: [successEmbed] });
        }
        catch (err) {
            console.log(err);
            await interaction.reply((0, GenUtils_1.errorEmbed)(`Something went wrong!\n\n\`CHECK CONSOLE\``));
            return;
        }
    }
    else {
        let timesToLoop = Math.floor(count / 100);
        const remainder = count % 100;
        while (timesToLoop >= 1) {
            timesToLoop -= 1;
            const filteredMsgs = await getMessagesWithFilter(100, channel, filter);
            if (filter && filteredMsgs) {
                msgsDeletedSize += filteredMsgs.length;
                for (const msg of filteredMsgs) {
                    try {
                        if (!msg || !msg.deletable)
                            continue;
                        messagesDeleted.push(`${msg.author.username}# | ${msg.content}`);
                    }
                    catch (err) { }
                }
            }
            else {
                await channel.messages.fetch({ limit: 100 }).then(async (messages) => {
                    msgsDeletedSize += messages.size;
                    for (const msgarray of messages) {
                        try {
                            const msg = msgarray[1];
                            if (!msg || !msg.deletable)
                                continue;
                            messagesDeleted.push(`${msg.author.username} | ${msg.content}`);
                        }
                        catch (err) { }
                    }
                });
            }
            try {
                await channel.bulkDelete(filteredMsgs || 100, true);
            }
            catch (err) {
                console.log(err);
                await interaction.reply((0, GenUtils_1.errorEmbed)(`Something went wrong!\n\n\`CHECK CONSOLE\``));
                return;
            }
        }
        const filteredMsgs = await getMessagesWithFilter(remainder, channel, filter);
        if (filter && filteredMsgs) {
            msgsDeletedSize += filteredMsgs.length;
            for (const msg of filteredMsgs) {
                try {
                    if (!msg || !msg.deletable)
                        continue;
                    messagesDeleted.push(`${msg.author.username} | ${msg.content}`);
                }
                catch (err) { }
            }
        }
        else {
            await channel.messages.fetch({ limit: remainder, cache: true }).then(async (messages) => {
                msgsDeletedSize += messages.size;
                for (const msgarray of messages) {
                    try {
                        const msg = msgarray[1];
                        if (!msg || !msg.deletable)
                            continue;
                        messagesDeleted.push(`${msg.author.username} | ${msg.content}`);
                    }
                    catch (err) {
                        console.log(err);
                    }
                }
            });
        }
        try {
            await channel.bulkDelete(await getMessagesWithFilter(remainder, channel, filter) || remainder, true);
            const successEmbed = new discord_js_1.EmbedBuilder()
                .setDescription(`${config_1.config.successEmoji} Successfully deleted ${msgsDeletedSize} messages`)
                .setColor("Blurple");
            await interaction.reply({ embeds: [successEmbed] });
        }
        catch (err) {
            console.log(err);
            await interaction.reply((0, GenUtils_1.errorEmbed)(`Something went wrong!\n\n\`CHECK CONSOLE\``));
            return;
        }
    }
    if (msgsDeletedSize === 0)
        return;
    (0, GenUtils_1.sendModLogs)({ guild: channel.guild, mod: member, action: "Purge", attachments: [await generateAttachmentFileFromArray(messagesDeleted)] }, { title: "Channel purged", actionInfo: `${msgsDeletedSize} messages were deleted` });
}
async function generateAttachmentFileFromArray(array) {
    const fileContent = array.join('\n');
    fs_1.default.writeFileSync(`${os_1.default.tmpdir}/purgeCMD.txt`, fileContent);
    const att = new discord_js_1.AttachmentBuilder(`${os_1.default.tmpdir}/purgeCMD.txt`);
    return att;
}
async function getMessagesWithFilter(count, channel, filter) {
    if (!filter)
        return null;
    const messagesToDelete = [];
    while (messagesToDelete.length < count) {
        await channel.messages.fetch({ limit: 100 }).then(async (messages) => {
            for (const msgarray of messages) {
                const msg = msgarray[1];
                if (!msg || !msg.deletable)
                    continue;
                if (messagesToDelete.length >= count)
                    return;
                if (!filter(msg))
                    continue;
                messagesToDelete.push(msg);
            }
        });
    }
    return messagesToDelete;
}
