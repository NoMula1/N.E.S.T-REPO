"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkBans = checkBans;
const Core_1 = require("../../Core");
const PostTemplates_1 = __importDefault(require("../../schemas/PostTemplates"));
const logging_1 = require("../../utils/logging");
async function checkBans() {
    // Find post templates which have been served and are not being held > 3 min
    const applicablePosts = await PostTemplates_1.default.find({
        isQueueServed: true,
        queueServedAt: {
            $lte: new Date(Date.now() - 180000)
        },
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
            /**
            {
                $or: [
                    {
                        isQueueServed: false
                    },
                    {
                        isQueueServed: { $exists: false}
                    }
                ]
            }
            */ // TODO: figure out how to standardize this query so it doesnt break queue serving restrictions https://discord.com/channels/489424959270158356/1233272423655276545/1303728423008473118
        ]
    });
    if (applicablePosts.length >= 1) {
        for (const post of applicablePosts) {
            const servedToUser = await Core_1.client.users.fetch(post.queueServedTo).catch(() => { });
            if (servedToUser) {
                await servedToUser.send(`Post<\`${post._id}\`> -- which has been served to you via \`/queue serve\` -- has remained inactive for more than 3 minutes. Due to consistency reasons, your ownership of the template is being lifted, and the post is being sent back into the queue.`).catch(() => { });
            }
            post.isQueueServed = false;
            post.isSuspended = false;
            post.waitingForApproval = true;
            post.queueServedTo = undefined;
            await post.save();
            logging_1.Log.debug(`Released post ${post._id} back into queue due to 3min inactivity`);
        }
    }
}
setInterval(checkBans, 1 * 10000);
