import "colors"
import { timeStringNow } from "./GenUtils"

/**
 * The severity of a log entry.
 * @enum {number}
 */
enum LogLevel {
	/** An unexpected circumstance. */
	Error = 0,
	/** An expected but negative circumstance. */
	Warning = 1,
	/** Important information. */
	Info = 2,
	/** Used for debugging code and logging a value. Unimportant information. */
	Debug = 3,
}

const Log = {
	/**
	 * Make a debug log entry.
	 * @param {string} message The message to include.
	 * @returns {void}
	 */
	debug(message: any): void {
		rawLog(LogLevel.Debug, message)
	},

	/**
	 * Make a info log entry.
	 * @param {string} message The message to include.
	 * @returns {void}
	 */
	info(message: any): void {
		rawLog(LogLevel.Info, message)
	},

	/**
	 * Make a warning log entry.
	 * @param {string} message The message to include.
	 * @returns {void}
	 */
	warn(message: any): void {
		rawLog(LogLevel.Warning, message)
	},

	/**
	 * Make a error log entry.
	 * @param {string} message The message to include.
	 * @returns {void}
	 */
	error(message: any): void {
		rawLog(LogLevel.Error, message)
	},
}

/**
 * Makes a log entry.
 * @param {LogLevel} level The severity of the entry.
 * @param {string} message The message to include.
 * @returns {Promise<void>}
 */
function rawLog(level: number, message: string): void {

	let levelString: string
	switch (level) {
		case 0: levelString = `[ERROR]`.red; break
		case 1: levelString = `[WARNING]`.yellow; break
		case 2: levelString = `[INFO]`.magenta; break
		case 3: levelString = `[DEBUG]`.blue; break
		default: levelString = ``
	}

	message = `${timeStringNow()} | ${levelString.padEnd(9)} | ${message}`
	// eslint-disable-next-line no-console
	console.log(message)

}

export { Log, LogLevel, rawLog }