"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = require("../../utils/logging");
const discord_js_1 = require("discord.js");
const fastFlags_1 = require("../../utils/fastFlags");
const FastFlag_1 = __importDefault(require("../../schemas/FastFlag"));
exports.default = {
    name: discord_js_1.Events.ClientReady,
    once: true,
    async execute() {
        logging_1.Log.info('Loading fast flags');
        for await (const flag of fastFlags_1.fastFlagList) {
            const foundData = await FastFlag_1.default.findOne({
                refName: flag.refName
            });
            if (!foundData) {
                logging_1.Log.info('Creating uninitialized fastflag ' + flag.refName);
                await FastFlag_1.default.create(flag);
            }
        }
        logging_1.Log.info('Finished loading fast flags');
    }
};
