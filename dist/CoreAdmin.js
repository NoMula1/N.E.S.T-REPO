"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const GenUtils_1 = require("./utils/GenUtils");
process.on('unhandledRejection', (err) => (0, GenUtils_1.handleError)(err));
process.on('uncaughtException', (err) => (0, GenUtils_1.handleError)(err));
const logging_1 = require("./utils/logging");
const config_1 = require("./utils/config");
const InitializeModules_1 = require("./utils/InitializeModules");
const CoreClient_1 = __importDefault(require("./bootstrap/CoreClient"));
const Mongoose_1 = __importDefault(require("./bootstrap/Mongoose"));
const GlobalScope_1 = require("./bootstrap/GlobalScope");
const client = new CoreClient_1.default(config_1.config.clientIDAdmin, {
    intents: []
});
if (process.env.NODE_ENV === "production")
    client.trackSentry();
else
    logging_1.Log.debug("Ignoring Sentry tracking for NEST-Admin while in development.");
(async function () {
    (0, GlobalScope_1.setScope)(GlobalScope_1.Scope.Admin);
    client.on("error", (err) => (0, GenUtils_1.handleError)(err));
    await (0, config_1.validateConfig)(GlobalScope_1.Scope.Admin).catch((err) => (0, GenUtils_1.handleError)(err)).then(() => logging_1.Log.info("Successfully validated the configuration file."));
    client.run(config_1.config.tokenAdmin);
    await (0, InitializeModules_1.initializeModules)(client).catch((err) => (0, GenUtils_1.handleError)(err)).then(() => logging_1.Log.info("Successfully initialized all modules."));
    (0, Mongoose_1.default)();
})();
