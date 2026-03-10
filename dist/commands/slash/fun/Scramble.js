"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const logging_1 = require("../../../utils/logging");
const lineReader = require("line-reader");
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("scramble")
    .setDescription("Scramble someone's nickname!")
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.None,
})
    .addUserOption(opt => opt
    .setName("user")
    .setDescription("[ADMIN ONLY] Scramble another user's nickname!")
    .setRequired(false))
    .setExecutor(async (interaction) => {
    var _a;
    if (!interaction.inCachedGuild())
        return;
    const member = interaction.options.getMember("user") || interaction.member;
    //check for perms if non - admin
    if (((_a = interaction.guild.roles.cache.find((r) => r.id === CommandExecutor_1.RoleIDS.Administrator)) === null || _a === void 0 ? void 0 : _a.position) > interaction.member.roles.highest.position && member) {
        await interaction.reply({
            content: "You can only run this command on yourself!",
            ephemeral: true
        });
        return;
    }
    const userOldName = member.nickname || member.user.globalName;
    const userNewName = await generateName();
    // Set the nickname
    member.setNickname(userNewName, "The funnies").catch((err) => logging_1.Log.error("Uh oh!\n" + err));
    await interaction.reply(`Scrambled username, you are now ${userNewName}!!`);
    // Unscramble the name after 30 seconds, nice
    unscrambleName(member, userOldName, userNewName);
});
/** Returns an array of entries in the dictionary.
 *  @returns {Promise<string[]>}
 */
async function readDictionary(name) {
    return new Promise((resolve, reject) => {
        const result = [];
        lineReader.eachLine(`./content/dicts/${name}.txt`, (line, last) => {
            result.push(line);
            if (last) {
                if (result.length == 0)
                    result.push("uh oh!");
                resolve(result);
            }
        });
    });
}
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}
/** Generates and returns a new funny name. */
async function generateName() {
    const nouns = await readDictionary("randomNouns");
    const verbs = await readDictionary("randomVerbs");
    const parts = [];
    for (let i = 0; i < getRandomInt(2) + 1; i++) {
        const newVerb = verbs[getRandomInt(verbs.length)];
        // Check if unique
        //if (!parts.some((other) => other === newVerb))
        parts[i] = newVerb;
        //else
        // Pick another
        //    i--
    }
    parts.push(nouns[getRandomInt(nouns.length)]);
    if (parts.join(" ").length > 32) {
        return generateName();
    }
    return parts.join(" ");
}
/** Removes the user's scramble after a certain amount of time */
function unscrambleName(member, oldName, newName) {
    setTimeout(() => {
        //const entry = affectedUsers.find((other) => other[0].id === id)
        // TODO: Use the entry
        // affectedUsers[user] = null
        // Do not change nickname if the user has changed their username from the scrambled name
        if (member.nickname !== newName)
            return;
        member.setNickname(oldName, "Reverse scramble action").catch((err) => { logging_1.Log.error(`Error in scramble.ts\n` + err); });
    }, 30000);
}
