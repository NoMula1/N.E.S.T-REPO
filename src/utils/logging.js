"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogLevel = exports.Log = void 0;
exports.rawLog = rawLog;
require("colors");
const GenUtils_1 = require("./GenUtils");
/**
 * The severity of a log entry.
 * @enum {number}
 */
var LogLevel;
(function (LogLevel) {
    /** An unexpected circumstance. */
    LogLevel[LogLevel["Error"] = 0] = "Error";
    /** An expected but negative circumstance. */
    LogLevel[LogLevel["Warning"] = 1] = "Warning";
    /** Important information. */
    LogLevel[LogLevel["Info"] = 2] = "Info";
    /** Used for debugging code and logging a value. Unimportant information. */
    LogLevel[LogLevel["Debug"] = 3] = "Debug";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
const Log = {
    /**
     * Make a debug log entry.
     * @param {string} message The message to include.
     * @returns {void}
     */
    debug(message) {
        rawLog(LogLevel.Debug, message);
    },
    /**
     * Make a info log entry.
     * @param {string} message The message to include.
     * @returns {void}
     */
    info(message) {
        rawLog(LogLevel.Info, message);
    },
    /**
     * Make a warning log entry.
     * @param {string} message The message to include.
     * @returns {void}
     */
    warn(message) {
        rawLog(LogLevel.Warning, message);
    },
    /**
     * Make a error log entry.
     * @param {string} message The message to include.
     * @returns {void}
     */
    error(message) {
        rawLog(LogLevel.Error, message);
    },
};
exports.Log = Log;
/**
 * Makes a log entry.
 * @param {LogLevel} level The severity of the entry.
 * @param {string} message The message to include.
 * @returns {Promise<void>}
 */
function rawLog(level, message) {
    let levelString;
    switch (level) {
        case 0:
            levelString = `[ERROR]`.red;
            break;
        case 1:
            levelString = `[WARNING]`.yellow;
            break;
        case 2:
            levelString = `[INFO]`.magenta;
            break;
        case 3:
            levelString = `[DEBUG]`.blue;
            break;
        default: levelString = ``;
    }
    message = `${(0, GenUtils_1.timeStringNow)()} | ${levelString.padEnd(9)} | ${message}`;
    // eslint-disable-next-line no-console
    console.log(message);
}
