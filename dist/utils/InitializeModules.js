"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeModules = initializeModules;
const logging_1 = require("../utils/logging");
const GenUtils_1 = require("../utils/GenUtils");
const RegisterEvents_1 = require("./RegisterEvents");
const RegisterSimpleCommands_1 = require("../utils/RegisterSimpleCommands");
const RegisterCommands_1 = require("../utils/RegisterCommands");
async function initializeModules(client) {
    (0, RegisterEvents_1.load)(client).catch((err) => (0, GenUtils_1.handleError)(err)).then(() => logging_1.Log.info("Successfully registered events."));
    Promise.all([
        (0, RegisterSimpleCommands_1.load)(client)
            .catch((err) => (0, GenUtils_1.handleError)(err))
            .then(() => logging_1.Log.info("Successfully added simple commands.")),
        (0, RegisterCommands_1.load)(client)
            .catch((err) => (0, GenUtils_1.handleError)(err))
            .then(() => logging_1.Log.info("Successfully added slash & context commands."))
    ]).then(() => client.registerCommands());
}
