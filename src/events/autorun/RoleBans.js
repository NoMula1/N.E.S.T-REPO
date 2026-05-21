"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRoleBans = checkRoleBans;
const RoleBans_1 = __importDefault(require("../../schemas/RoleBans"));
const Case_1 = __importDefault(require("../../schemas/Case"));
const Core_1 = require("../../Core");
async function checkRoleBans() {
    const usersBanned = await RoleBans_1.default.find({
        endDate: { $lt: Math.floor(Date.now() / 1000), $gt: 0 }
    });
    if (!usersBanned || usersBanned.length <= 0)
        return;
    usersBanned.forEach(async (file) => {
        var _a;
        const user = await Core_1.client.users.fetch(file.userID).catch(() => { });
        if (!user) {
            await file.deleteOne();
            console.log("No user found!");
            return;
        }
        const guild = await Core_1.client.guilds.fetch(file.guildID).catch(() => { });
        if (!guild) {
            await file.deleteOne();
            console.log("No guild found!");
            return;
        }
        await Case_1.default.findOneAndUpdate({
            guildID: guild.id,
            caseNumber: file.caseNumber,
        }, {
            active: false
        });
        await ((_a = guild.members.cache.get(user.id)) === null || _a === void 0 ? void 0 : _a.roles.remove(file.roleID).catch(() => { console.log("Err 1!"); }));
        await file.deleteOne({
            guildID: file.guildID,
            userID: file.userID,
            endDate: file.endDate
        });
    });
}
setInterval(checkRoleBans, 13 * 1000);
