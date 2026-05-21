"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = setup;
const mongoose_1 = __importDefault(require("mongoose"));
const logging_1 = require("../utils/logging");
const GenUtils_1 = require("../utils/GenUtils");
function setup() {
    return new Promise((resolve, reject) => {
        mongoose_1.default.connect(`${process.env.MONGO_URI}`, {
            maxPoolSize: 10,
            minPoolSize: 2,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 120000,
            serverSelectionTimeoutMS: 120000,
            retryWrites: true
        }).then(() => {
            logging_1.Log.debug("Mongoose has connected successfully.");
            resolve(undefined);
        }, (err) => {
            logging_1.Log.error("MongoDB Connection Failed: " + err.message);
            (0, GenUtils_1.handleError)(err);
            reject(err);
        });
    });
}
