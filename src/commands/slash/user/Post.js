"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const config_1 = require("../../../utils/config");
const GenUtils_1 = require("../../../utils/GenUtils");
const RoleBans_1 = __importDefault(require("../../../schemas/RoleBans"));
const Case_1 = __importDefault(require("../../../schemas/Case"));
const PostTemplates_1 = __importDefault(require("../../../schemas/PostTemplates"));
const FastFlag_1 = __importDefault(require("../../../schemas/FastFlag"));
const GuildConfigCache_1 = require("../../../utils/GuildConfigCache");
const logging_1 = require("../../../utils/logging");
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("post")
    .setDescription("Create a post in our marketplace!")
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.None,
})
    .addStringOption(opt => opt
    .setName("job_type")
    .setDescription("Which part of the marketplace would you like to submit a post to?")
    .setRequired(true)
    .addChoices({ name: "Hiring", value: "HIRING" }, { name: "For Hire", value: "FOR_HIRE" }, { name: "Selling", value: "SELLING" }))
    .setExecutor(async (interaction) => {
    var _a, _b, _c, _d, _e, _f, _g;
    if (!interaction.inCachedGuild()) {
        interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true });
        return;
    }
    const postingDisabled = await FastFlag_1.default.findOne({
        refName: 'DisablePostCreation',
        enabled: true
    });
    if (postingDisabled) {
        await interaction.reply({
            ephemeral: true,
            content: 'Posting is currently disabled. Please try again later.'
        });
        return;
    }
    await interaction.reply({ content: `${config_1.config.loadingEmoji} Verifying posting information...`, ephemeral: true, fetchReply: true });
    if (interaction.member.roles.cache.find((r) => r.name.toLowerCase() === "market banned")) {
        const findRoleBan = await RoleBans_1.default.findOne({
            guildID: interaction.guild.id,
            userID: interaction.user.id,
            type: "MARKET BAN"
        });
        if (!findRoleBan) {
            await interaction.editReply({ content: `${config_1.config.failedEmoji} You are currently banned from using the marketplace, but I was unable to find a valid ban file.` });
            return;
        }
        const findCase = await Case_1.default.findOne({
            guildID: interaction.guild.id,
            caseNumber: findRoleBan.caseNumber,
        });
        await interaction.editReply({
            content: `${config_1.config.failedEmoji} You are currently banned from using the marketplace\n**Ends:** <t:${findCase === null || findCase === void 0 ? void 0 : findCase.durationUnix}> (<t:${findCase === null || findCase === void 0 ? void 0 : findCase.durationUnix}:R>)`
        });
        return;
    }
    const jobType = interaction.options.getString("job_type");
    if (!jobType) {
        await interaction.editReply({ content: `${config_1.config.failedEmoji} Unable to fetch job type. If this error persists, please contact a bot developer.` });
        return;
    }
    await interaction.editReply({ content: `${config_1.config.loadingEmoji} Fetching post template...` });
    const postTemplateQuery = PostTemplates_1.default.findOne({
        guildID: interaction.guild.id,
        userID: interaction.user.id,
        jobType: jobType
    }, {
        description: 1,
        payment: 1,
        approved: 1,
        waitingForApproval: 1,
        author: 1,
        embedColor: 1,
        thumbnail: 1,
        image: 1,
        footer: 1,
        talentHubLink: 1,
        jobType: 1
    });
    const guildCfg = await (0, GuildConfigCache_1.getGuildConfig)(interaction.guild.id);
    const requireApproval = (_a = guildCfg === null || guildCfg === void 0 ? void 0 : guildCfg.requirePostApproval) !== null && _a !== void 0 ? _a : true;
    const lotteryTotal = (_b = guildCfg === null || guildCfg === void 0 ? void 0 : guildCfg.postApprovalLottery) !== null && _b !== void 0 ? _b : 0;
    // Collect all configured developer role IDs for auto-approval check
    const devRoleIds = [
        (_c = guildCfg === null || guildCfg === void 0 ? void 0 : guildCfg.roles) === null || _c === void 0 ? void 0 : _c.MasterDeveloper,
        (_d = guildCfg === null || guildCfg === void 0 ? void 0 : guildCfg.roles) === null || _d === void 0 ? void 0 : _d.ExpertDeveloper,
        (_e = guildCfg === null || guildCfg === void 0 ? void 0 : guildCfg.roles) === null || _e === void 0 ? void 0 : _e.SeniorDeveloper,
        (_f = guildCfg === null || guildCfg === void 0 ? void 0 : guildCfg.roles) === null || _f === void 0 ? void 0 : _f.Developer,
        (_g = guildCfg === null || guildCfg === void 0 ? void 0 : guildCfg.roles) === null || _g === void 0 ? void 0 : _g.NoviceDeveloper,
    ].filter((id) => typeof id === 'string' && /^\d{17,20}$/.test(id));
    const memberIsDevRole = devRoleIds.length > 0 &&
        interaction.member.roles.cache.hasAny(...devRoleIds);
    let postTemplate = await postTemplateQuery;
    if (!postTemplate) {
        await interaction.editReply({ content: `${config_1.config.loadingEmoji} No post template found! Creating one...` });
        let isApproved = false;
        const lotteryGuess = Math.random();
        //Log.debug(`Post lottery attempt: ${lotteryTotal} > ${lotteryGuess}`)
        if (lotteryTotal > lotteryGuess) {
            isApproved = true;
            await interaction.user.send(`Your post has been auto-approved.\nReason: Anti-overload lottery`).catch(() => {
                logging_1.Log.error(`Unable to inform the user ${interaction.user.id} that their post has been auto-approved (lottery)`);
            });
        }
        if (memberIsDevRole) {
            isApproved = true;
            await interaction.user.send(`Your post has been auto-approved.\nReason: Developer role`).catch(() => {
                logging_1.Log.error(`Unable to inform the user ${interaction.user.id} that their post has been auto-approved (dev role)`);
            });
        }
        postTemplate = new PostTemplates_1.default({
            guildID: interaction.guild.id,
            userID: interaction.user.id,
            jobType: jobType,
            bitwiseTags: 0,
            approved: isApproved,
            isQueueServed: false,
            isSuspended: false,
            suspensionRenewCount: 0
        });
        postTemplate.save().catch(async (err) => {
            (0, GenUtils_1.handleError)(err);
            await interaction.editReply({ content: `${config_1.config.failedEmoji} Unable to create post template! If this error persists, please contact a bot developer.` });
            return;
        });
    }
    else {
        if (memberIsDevRole && postTemplate.approved === false) {
            postTemplate.approved = true;
            await postTemplate.save();
            await interaction.user.send(`Your post has been auto-approved.\nReason: Developer role`).catch(() => { });
        }
    }
    await interaction.editReply({ content: `${config_1.config.loadingEmoji} Generating template embed...` });
    const templateEmbed = await generateEmbed(postTemplate, interaction.user, interaction.guild, requireApproval);
    await interaction.editReply({ content: `${config_1.config.loadingEmoji} Generating template buttons...` });
    await interaction.editReply({ content: templateEmbed.PostMessage, embeds: [templateEmbed.PostEmbed], components: templateEmbed.PostButtons.map(btn => btn) });
});
async function generateEmbed(template, user, guild, requirePostApproval = true) {
    let postEmoji = config_1.config.successEmoji;
    let issuesFound = 0;
    let postIssues = ``;
    if (!template.description) {
        issuesFound++;
        postIssues = postIssues + "\n> No description set.";
        postEmoji = config_1.config.failedEmoji;
    }
    if (!template.payment.robux && !template.payment.money && !template.payment.other) {
        issuesFound++;
        postIssues = postIssues + "\n> No payments set.";
        postEmoji = config_1.config.failedEmoji;
    }
    if (template.approved == false && requirePostApproval == true && !template.waitingForApproval) {
        issuesFound++;
        postIssues = postIssues + "\n> You must submit your template for approval.";
        postEmoji = config_1.config.failedEmoji;
    }
    postIssues = `**Found ${issuesFound} issues:**` + postIssues;
    const embed = new discord_js_1.EmbedBuilder()
        .setAuthor({ name: template.author || `${user.username} | Edit this by boosting! (Will not show once posted)`, iconURL: user.displayAvatarURL() || undefined })
        .setColor(template.embedColor || "Green")
        .setDescription(template.description || "No description set! Make sure to add as much detail as possible.")
        .addFields({ name: "Payment", value: `**Robux:** ${template.payment.robux || "NONE SET"}\n**Money:** ${template.payment.money || "NONE SET"}\n**Other:** ${template.payment.other || "NONE SET"}` })
        .setThumbnail(template.thumbnail || null)
        .setFooter({ text: template.footer.text || "None set | Edit this by boosting! (Will not show once posted)", iconURL: template.footer.icon || undefined });
    if (template.image) {
        embed.setImage(template.image);
    }
    if (template.talentHubLink) {
        embed.addFields({ name: 'Talent Hub', value: template.talentHubLink, inline: true });
    }
    const templateRow = new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.ButtonBuilder()
        .setLabel("Send Post")
        .setCustomId("send_post")
        .setEmoji("⬆️")
        .setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder()
        .setLabel("Edit Extras")
        .setCustomId("edit_extras")
        .setEmoji("👑")
        .setStyle(discord_js_1.ButtonStyle.Primary));
    if (template.approved == false && requirePostApproval == true) {
        templateRow.components[0].setLabel("Submit for Approval")
            .setCustomId("send_approval")
            .setEmoji("🗳")
            .setStyle(discord_js_1.ButtonStyle.Primary);
    }
    const templateRowSecondary = new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.ButtonBuilder()
        .setLabel("Edit Description")
        .setCustomId("edit_desc")
        .setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder()
        .setLabel("Edit Payment")
        .setCustomId("edit_payment")
        .setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder()
        .setLabel("Edit Images")
        .setCustomId("edit_images")
        .setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder()
        .setLabel("Add Talent Hub")
        .setCustomId("add_talent_hub")
        .setEmoji("🎨")
        .setStyle(discord_js_1.ButtonStyle.Secondary));
    if (issuesFound > 1 && template.approved == false && requirePostApproval == true) {
        templateRow.components[0].setDisabled(true);
    }
    if (issuesFound > 0 && requirePostApproval == false) {
        templateRow.components[0].setDisabled(true);
    }
    const templateRowPrem = new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.ButtonBuilder()
        .setLabel("Delete Template")
        .setCustomId("delete_template")
        .setEmoji("🗑")
        .setStyle(discord_js_1.ButtonStyle.Danger));
    if (template.waitingForApproval == true) {
        postEmoji = config_1.config.warnEmoji;
        postIssues = "Your job post is currently awaiting approval.";
        issuesFound = 1;
        for (const comp of templateRow.components) {
            comp.setDisabled(true);
        }
        for (const comp of templateRowSecondary.components) {
            comp.setDisabled(true);
        }
        for (const comp of templateRowPrem.components) {
            comp.setDisabled(true);
        }
    }
    let message = `${postEmoji} Post for ${template.jobType.toLowerCase()}`;
    if (issuesFound > 0) {
        message = message + `\n${postIssues}`;
    }
    return { PostEmbed: embed, PostMessage: message, PostButtons: [templateRow, templateRowSecondary, templateRowPrem] };
}
