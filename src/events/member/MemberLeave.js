"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const PendingDeletion_1 = __importDefault(require("../../schemas/PendingDeletion"));
exports.default = {
    name: discord_js_1.Events.GuildMemberRemove,
    once: false,
    async execute(_, member) {
        console.log(member.id + ' left, creating deletion...');
        await PendingDeletion_1.default.create({
            userID: member.id
        });
    }
};
