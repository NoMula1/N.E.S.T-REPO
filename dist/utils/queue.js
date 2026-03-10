"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserInformation = getUserInformation;
exports.validateAllQueues = validateAllQueues;
exports.getNextInQueue = getNextInQueue;
exports.getQueueLength = getQueueLength;
exports.resolveTemplateFromContent = resolveTemplateFromContent;
exports.claimOwnership = claimOwnership;
exports.validateOwnership = validateOwnership;
const PostTemplates_1 = __importDefault(require("../schemas/PostTemplates"));
const CoreClient_1 = __importDefault(require("../bootstrap/CoreClient"));
async function getUserInformation(id) {
    const heldPosts = await PostTemplates_1.default.countDocuments({
        isQueueServed: true,
        queueServedTo: id,
        isSuspended: true
    });
    const currentlyViewingPost = await PostTemplates_1.default.findOne({
        isQueueServed: true,
        queueServedTo: id,
        isSuspended: false
    });
    return {
        heldPosts,
        currentlyViewingPost
    };
}
async function validateAllQueues() {
    var _a, _b;
    const expiredQueuedTemplates = await PostTemplates_1.default.find({
        isQueueServed: true,
        isSuspended: false,
        waitingForApproval: true,
        queueServedAt: {
            $lt: new Date().setMinutes(new Date().getMinutes() - 10)
        }
    });
    for (const expired of expiredQueuedTemplates) {
        const user = (_b = CoreClient_1.default.instance.users.cache.get((_a = expired.queueServedTo) !== null && _a !== void 0 ? _a : "0")) !== null && _b !== void 0 ? _b : await CoreClient_1.default.instance.users.fetch(expired.queueServedTo);
        if (user) {
            await user.send(`You seem to have left a post template in the queue unattended for more than 10 minutes, so I've released it back into the queue for you.`);
        }
        await expired.updateOne({
            isQueueServed: false,
            isSuspended: false
        });
    }
}
async function getNextInQueue() {
    const nextInQueue = await PostTemplates_1.default.findOne({
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
    }).sort({ updatedAt: 1 }).exec();
    return nextInQueue;
}
async function getQueueLength() {
    return await PostTemplates_1.default.countDocuments({
        isQueueServed: false,
        isSuspended: false,
        waitingForApproval: true
    });
}
async function resolveTemplateFromContent(content) {
    const spl = content.split("~");
    if (spl.length < 2)
        return null;
    return (await PostTemplates_1.default.findOne({
        _id: spl[1].trim()
    }));
}
async function claimOwnership(id, interaction) {
    const found = await PostTemplates_1.default.findOne({
        _id: id
    });
    if (!found)
        return;
    await found.updateOne({
        queueServedTo: interaction.user.id,
        queueServedAt: new Date(),
        isQueueServed: true,
    });
}
async function validateOwnership(id, userId) {
    const validated = await PostTemplates_1.default.findOne({
        _id: id,
        waitingForApproval: true,
        isQueueServed: true,
        queueServedTo: userId
    });
    return validated !== undefined && validated !== null;
}
