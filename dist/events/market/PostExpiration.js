"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkCases = checkCases;
const Post_1 = __importDefault(require("../../schemas/Post"));
const FastFlag_1 = __importDefault(require("../../schemas/FastFlag"));
const logging_1 = require("../../utils/logging");
const Core_1 = require("../../Core");
let globalIsTaskWorking = false;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function checkCases() {
    if (globalIsTaskWorking)
        return; // task is already working through (assumably) a large dataset, we dont want to double team here!!
    globalIsTaskWorking = true;
    const flag = await FastFlag_1.default.findOne({
        refName: 'DoPostExpiration',
        enabled: true
    });
    if (!flag) {
        return;
    }
    const expiredPosts = await Post_1.default.find({
        createdAt: {
            $lt: Date.now() - 7 * 24 * 60 * 60 * 1000
        }
    });
    let batchTracker = 0;
    for (const expiredPost of expiredPosts) {
        // check if message exists
        batchTracker += 1;
        const channel = await Core_1.client.channels.fetch(expiredPost.jobChannelId).catch(() => { });
        if (!channel) {
            logging_1.Log.info(`Deleting post with ID ${expiredPost._id} because it has expired.`);
            await expiredPost.deleteOne();
            if (batchTracker >= 5) {
                batchTracker = 0;
                await sleep(5000);
            }
            continue;
        }
        const message = await channel.messages.fetch(expiredPost.messageId).catch(async (err) => { });
        if (!message) {
            logging_1.Log.info(`Deleting post with ID ${expiredPost._id} because it has expired.`);
            await expiredPost.deleteOne();
            if (batchTracker >= 5) {
                batchTracker = 0;
                await sleep(5000);
            }
            continue;
        }
        await message.delete().catch(async (err) => { });
        logging_1.Log.info(`Deleting post with ID ${expiredPost._id} because it has expired.`);
        await expiredPost.deleteOne();
        if (batchTracker >= 5) {
            batchTracker = 0;
            await sleep(5000);
        }
    }
    globalIsTaskWorking = false;
}
setInterval(checkCases, 60000);
