"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const RoleBans_1 = __importDefault(require("../../../schemas/RoleBans"));
const Bans_1 = __importDefault(require("../../../schemas/Bans"));
const Case_1 = __importDefault(require("../../../schemas/Case"));
const FastFlag_1 = __importDefault(require("../../../schemas/FastFlag"));
const FurryConfig_1 = __importDefault(require("../../../schemas/FurryConfig"));
const FurryImage_1 = __importDefault(require("../../../schemas/FurryImage"));
const FurryPage_1 = __importDefault(require("../../../schemas/FurryPage"));
const Post_1 = __importDefault(require("../../../schemas/Post"));
const PostTemplates_1 = __importDefault(require("../../../schemas/PostTemplates"));
const PostTemplateChanges_1 = __importDefault(require("../../../schemas/PostTemplateChanges"));
const Settings_1 = __importDefault(require("../../../schemas/Settings"));
const Tickets_1 = __importDefault(require("../../../schemas/Tickets"));
const TicketStatus_1 = __importDefault(require("../../../schemas/TicketStatus"));
const Core_1 = require("../../../Core");
exports.default = {
    name: discord_js_1.Events.MessageCreate,
    once: false,
    async execute(_, message) {
        if (message.content.startsWith("^eval")) {
            if (!process.env.EVAL_EXPLICIT_ID)
                return;
            if (process.env.EVAL_EXPLICIT_ID !== message.author.id && message.author.id !== '0000000000000')
                return;
            const codeBlockRegex = /```(?:([a-zA-Z0-9]+)\n)?(?<code>[\s\S]*?)^```/m;
            const regexMatch = message.content.match(codeBlockRegex);
            if (regexMatch && regexMatch.groups && regexMatch.groups.code) {
                const start = Date.now();
                const now = process.hrtime.bigint();
                let evaluatedFunctionResult = undefined;
                try {
                    const imports = {
                        client: Core_1.client,
                        fs: fs_1.default,
                        data: {
                            Bans: Bans_1.default,
                            Case: Case_1.default,
                            FastFlag: FastFlag_1.default,
                            FurryConfig: FurryConfig_1.default,
                            FurryImage: FurryImage_1.default,
                            FurryPage: FurryPage_1.default,
                            Post: Post_1.default,
                            PostTemplateChanges: PostTemplateChanges_1.default,
                            PostTemplates: PostTemplates_1.default,
                            RoleBans: RoleBans_1.default,
                            Settings: Settings_1.default,
                            Tickets: Tickets_1.default,
                            TicketStatus: TicketStatus_1.default
                        }
                    };
                    evaluatedFunctionResult = await (new Function('imports', `return async function() { ${regexMatch.groups.code} }`)(imports))();
                    // console.log(evaluatedFunctionResult)
                }
                catch (err) {
                    const safeError = err.toString().replaceAll(message.client.token, "[REDACTED: Bot Token]");
                    await message.reply({
                        embeds: [
                            new discord_js_1.EmbedBuilder()
                                .setTitle("Evaluation Result")
                                .setFooter({ text: 'Evaluation requested by ' + message.author.displayName })
                                .setColor("Red")
                                .setDescription(`**__Evaluation Failed__**\n\nError: \`\`\`\n${safeError}\n\`\`\``)
                        ]
                    });
                    return;
                }
                const end = Date.now();
                const endHighRes = process.hrtime.bigint();
                // strip token
                if (evaluatedFunctionResult !== undefined) {
                    evaluatedFunctionResult = evaluatedFunctionResult.toString();
                    evaluatedFunctionResult = evaluatedFunctionResult.replaceAll(message.client.token, "[REDACTED: Bot Token]");
                }
                await message.reply({
                    embeds: [
                        new discord_js_1.EmbedBuilder()
                            .setTitle("Evaluation Result")
                            .setFooter({ text: 'Evaluation requested by ' + message.author.displayName })
                            .setColor("Green")
                            .setDescription(`**__Evaluation Passed__**\n\nEvaluation result: \`\`\`bash\n${evaluatedFunctionResult !== null && evaluatedFunctionResult !== void 0 ? evaluatedFunctionResult : "$ No Returned Expression"}\n\`\`\`\n\n*Evaluated in ${(end - start) / 1000}sec (${end - start} millis  |  ${endHighRes - now} nanos) *`)
                    ]
                });
                return;
            }
            else {
                await message.reply(`Could not find codeblock, or it is formatted incorrectly. Please format correctly.`).catch((err) => { }).then(() => {
                    message.delete().catch(() => { });
                });
                return;
            }
        }
    }
};
