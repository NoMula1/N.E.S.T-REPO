"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkCases = checkCases;
const Case_1 = __importDefault(require("../../../schemas/Case"));
async function checkCases() {
    const cases = await Case_1.default.find({
        durationUnix: { $lt: Date.now() / 1000 },
        active: true
    });
    if (!cases || cases.length <= 0)
        return;
    cases.forEach(async (singleCase) => {
        if (singleCase.durationUnix == 0)
            return;
        await singleCase.updateOne({
            active: false
        });
    });
}
setInterval(checkCases, 10 * 1000);
