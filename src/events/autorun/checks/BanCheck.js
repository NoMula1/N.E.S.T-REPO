"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkBans = checkBans;
const CoreClient_1 = __importDefault(require("../../../bootstrap/CoreClient"));
const Bans_1 = __importDefault(require("../../../schemas/Bans"));
const Case_1 = __importDefault(require("../../../schemas/Case"));
async function checkBans() {
    const bans = await Bans_1.default.find({
        endDate: { $lt: Math.floor(Date.now() / 1000) }
    });
    if (!bans || bans.length <= 0)
        return;
    bans.forEach(async (ban) => {
        const user = await CoreClient_1.default.instance.users.fetch(ban.userID).catch(() => { });
        if (!user)
            return;
        const guild = await CoreClient_1.default.instance.guilds.fetch(ban.guildID).catch(() => { });
        if (!guild)
            return;
        const theCase = await Case_1.default.findOneAndUpdate({
            guildID: guild.id,
            caseNumber: ban.caseNumber,
        }, {
            active: false
        });
        if ((theCase === null || theCase === void 0 ? void 0 : theCase.active) == true)
            return;
        await guild.members.unban(user, "Ban expired.").catch(() => { return; });
        await ban.deleteOne({
            guildID: ban.guildID,
            userID: ban.userID,
            endDate: ban.endDate
        });
    });
}
setInterval(checkBans, 10 * 1000);
