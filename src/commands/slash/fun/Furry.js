"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNextImage = getNextImage;
const FurryImage_1 = __importDefault(require("../../../schemas/FurryImage"));
const FurryPage_1 = __importDefault(require("../../../schemas/FurryPage"));
const discord_js_1 = require("discord.js");
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("furry")
    .setDescription("PoSt bIg Fury Enewergy OwO!!1!")
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.None
})
    .setExecutor(async (interaction) => {
    console.log('called furry');
    if (!interaction.inCachedGuild)
        return;
    const furryImage = await getNextImage('gallery_id:995');
    if (!furryImage) {
        await interaction.reply('Sowwy OwO! nyo images couwd be found... : c');
        return;
    }
    const embed = new discord_js_1.EmbedBuilder();
    if (furryImage.sourceUrl !== '')
        embed.setDescription(`Sauce: ${furryImage.sourceUrl}`);
    embed.setColor('#5c10bd');
    embed.setImage(furryImage.imageUrl);
    if (furryImage.authorName !== '')
        embed.setFooter({ text: `By ${furryImage.authorName} (post ${furryImage.postId})` });
    else
        embed.setFooter({ text: `Post ${furryImage.postId}` });
    await interaction.reply({ embeds: [embed] });
});
async function createPage(pageModel, imageModel, pageID, dlPage) {
    const newFurryPage = new pageModel({
        pageId: pageID,
        nextImageId: 1,
        totalImages: dlPage.images.length
    });
    newFurryPage.save().catch(() => { });
    let imageID = 0;
    for (const dlImage of dlPage.images) {
        if (dlImage.hidden_from_users || dlImage.spoilered || dlImage.duplicate_of !== null || dlImage.format === 'webm')
            continue;
        const authorTag = dlImage.tags.find((t) => t.startsWith('artist:'));
        const imageEntry = new imageModel({
            imageId: imageID++,
            postId: parseInt(dlImage.id, 10),
            imageUrl: dlImage.representations.medium,
            sourceUrl: dlImage.source_url || '',
            authorName: authorTag !== undefined ? authorTag.split(':')[1] : ''
        });
        imageEntry.save();
    }
    await pageModel.updateOne({
        totalImages: imageID
    });
}
async function getNextPage(pageModel, imageModel, filter, lastPage) {
    const url = `https://furbooru.org/api/v1/json/search/images?filter_id=34&q=${encodeURIComponent(filter)}&sf=random&sd=desc&per_page=50`;
    if (lastPage === null) {
        const dlPage = await (await fetch(url + '&page=1')).json();
        return await createPage(pageModel, imageModel, 1, dlPage);
    }
    else if (lastPage.nextImageId + 1 >= lastPage.totalImages) {
        // Replace the page
        const pageId = lastPage.pageId + 1;
        const dlPage = await (await fetch(url + '&page=' + pageId)).json();
        await pageModel.deleteMany();
        await imageModel.deleteMany();
        if (dlPage.images.length === 0) // Last page, loop back around
            return await getNextPage(pageModel, imageModel, filter, null);
        return await createPage(pageModel, imageModel, pageId, dlPage);
    }
    else {
        const foundFurryPage = await pageModel.findOneAndUpdate({}, {
            $inc: { nextImageId: 1 }
        });
        return foundFurryPage;
    }
}
async function getNextImage(filter, pageModel = FurryPage_1.default, imageModel = FurryImage_1.default) {
    let imagePage = await pageModel.findOne();
    let image;
    if (imagePage === null) {
        imagePage = await getNextPage(pageModel, imageModel, filter, null);
        image = await imageModel.findOne({ imageId: 0 });
    }
    else {
        image = await imageModel.findOne({ imageId: imagePage.nextImageId });
        await getNextPage(pageModel, imageModel, filter, imagePage);
    }
    return image;
}
