import mongoose from "mongoose"
import { Log } from "../utils/logging"
import { handleError } from "../utils/GenUtils"

export default function setup() {
	return new Promise((resolve, reject) => {
		mongoose.connect(`${process.env.MONGO_URI}`, {
			maxPoolSize: 10,
			minPoolSize: 2,
			socketTimeoutMS: 45000,
			connectTimeoutMS: 120000,
			serverSelectionTimeoutMS: 120000,
			retryWrites: true
		}).then(() => {
			Log.debug("Mongoose has connected successfully.")
			resolve(undefined)
		}, (err: Error) => {
			Log.error("MongoDB Connection Failed: " + err.message)
			handleError(err)
			reject(err)
		})
	})
}
