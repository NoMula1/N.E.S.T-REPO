"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.load = load;
/* eslint-disable @typescript-eslint/no-explicit-any */
const path_1 = __importDefault(require("path"));
const GlobalScope_1 = require("../bootstrap/GlobalScope");
const glob_1 = require("glob");
async function load(client) {
    var _a;
    const fileExt = __filename.endsWith('.ts') ? '.ts' : '.js';
    const eventPath = path_1.default.join(__dirname, "..", "events");
    const eventFiles = (0, glob_1.sync)(`**/*${fileExt}`, {
        cwd: eventPath,
        nodir: true,
        absolute: false
    });
    for (const file of eventFiles) {
        const filePath = path_1.default.join(eventPath, file);
        const event = (await Promise.resolve(`${filePath}`).then(s => __importStar(require(s)))).default;
        if (!(event === null || event === void 0 ? void 0 : event.execute) && !Object.keys(event !== null && event !== void 0 ? event : {}).some(k => k.startsWith("on")))
            continue; // Avoid non-event objects
        if ((_a = event === null || event === void 0 ? void 0 : event.scope) !== null && _a !== void 0 ? _a : GlobalScope_1.Scope.Default === GlobalScope_1.scope) {
            if (event.name) {
                if (event.once) {
                    client.once(event.name, (...args) => event.execute(createOptions(client, ...args), ...args));
                }
                else {
                    client.on(event.name, (...args) => event.execute(createOptions(client, ...args), ...args));
                }
            }
            for (const [eventName, eventFunc] of Object.entries(event)) {
                if (eventName.startsWith("on") && typeof eventFunc === "function") {
                    const formalEventName = eventName.substring(2, 3).toLowerCase() + eventName.substring(3);
                    client.on(formalEventName, (...args) => eventFunc(createOptions(client, ...args), ...args));
                }
            }
        }
    }
}
function createOptions(client, ..._args) {
    return {
        client
    };
}
