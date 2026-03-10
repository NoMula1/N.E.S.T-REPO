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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _MockClient_unmockedEnv;
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const logging_1 = require("../../src/utils/logging");
const MockREST_1 = __importDefault(require("./MockREST"));
class MockClient extends discord_js_1.Client {
    constructor() {
        super({
            intents: Object.values(discord_js_1.GatewayIntentBits)
        });
        this.rest = new MockREST_1.default(this);
    }
    static async prepareEnv() {
        var _b;
        const workers = await Promise.resolve().then(() => __importStar(require('node:worker_threads')));
        __classPrivateFieldSet(_a, _a, (_b = process.env) !== null && _b !== void 0 ? _b : workers.workerData, "f", _MockClient_unmockedEnv);
        if (workers.workerData) {
            logging_1.Log.info('workerData set, will replace for the MockClient!');
            workers.workerData = _a.mockEnv;
        }
        logging_1.Log.info('Will replace process.env for the MockClient!');
        process.env = _a.mockEnv;
    }
    static async unprepareEnv() {
        const workers = await Promise.resolve().then(() => __importStar(require('node:worker_threads')));
        if (workers.workerData) {
            logging_1.Log.info('Restoring workerData');
            workers.workerData = __classPrivateFieldGet(_a, _a, "f", _MockClient_unmockedEnv);
        }
        logging_1.Log.info('Restoring process.env');
        process.env = __classPrivateFieldGet(_a, _a, "f", _MockClient_unmockedEnv);
    }
    static get mockEnv() {
        // Nothing for now
        return {};
    }
    get mockrest() {
        return this.rest;
    }
}
_a = MockClient;
_MockClient_unmockedEnv = { value: void 0 };
exports.default = MockClient;
