"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkExpiredData = checkExpiredData;
const PostTemplates_1 = __importDefault(require("../../../schemas/PostTemplates"));
const logging_1 = require("../../../utils/logging");
// Delete all data that does not contain createdAt
PostTemplates_1.default.deleteMany({
    createdAt: {
        $exists: false
    }
}).then((query) => {
    logging_1.Log.info(`Deleted ${query.deletedCount} post templates which do not contain createdAt field`);
}).catch((err) => {
    logging_1.Log.error('Unable to clean post templates without createdAt field: ' + err);
});
async function checkExpiredData() {
    return;
    /**
    const templateEXPflag = await FastFlag.findOne({
        refName: 'DoPostTemplateExpiration',
        enabled: true
    });
    if (!templateEXPflag) {
        return;
    }

    await PostTemplates.deleteMany({
        createdAt: {
            $lt: new Date().setDate(new Date().getDate() - 30)
        }
    }).then(async (q) => {
        if (q.deletedCount < 1)
            return;
        Log.info(`Deleted ${q.deletedCount} expired post templates from the database`);
    }).catch((err: any) => {
        Log.error('Unable to delete outdated post templates: ' + err);
    });
    const posts = await Post.find({
        createdAt: {
            $lt: new Date().setDate(new Date().getDate() - 30)
        }
    });
    const postEXPflag = await FastFlag.findOne({
        refName: 'DoPostExpiration',
        enabled: true
    });
    if (!postEXPflag) {
        return;
    }
    try {
        for (const post of posts) {
            if (post.messageId) {
                const messageId = post.messageId;
                const channelId = post.jobChannelId;

                if (channelId) {
                    const channel = await CoreClient.instance.channels.fetch(channelId).catch((err)=>{}) as TextChannel;
                    if (channel) {
                        const message = await channel.messages.fetch(messageId).catch((err)=>{}) as Message;
                        if (message) {
                            await message.delete().catch(err => Log.error(`${err} - ${messageId}`));
                            await post.deleteOne({ messageId: messageId }).catch(err => Log.error(`${err} - ${messageId}`));
                        } else {
                            Log.error(`messageid: ${messageId} not found in channel: ${channelId}`);
                        }
                    }
                }
                await new Promise(res => setTimeout(res, 20 * 1000));
            }
        }
    }
    catch (e: any) {
        Log.error(e);
    }
    */
}
checkExpiredData();
setInterval(checkExpiredData, 60000);
