"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CommandExecutor_1 = require("../../../utils/CommandExecutor");
const GCBouncerRole = "1255002765135052801";
const GCRole = "1229646154971484242";
exports.default = new CommandExecutor_1.CommandExecutor()
    .setName("gclubbouncerassign")
    .setDescription("Assign a gentlemens club to someone.")
    .addStringOption(op => op.setName('role').setDescription('The role to assign').setChoices({ name: 'Gentlemens Club', value: 'gc' }).setRequired(true))
    .addUserOption(op => op.setName('user').setDescription('The user').setRequired(true))
    .setBasePermission({
    Level: CommandExecutor_1.PermissionLevel.None,
})
    .setExecutor(async (i) => {
    var _a, _b;
    await i.deferReply({ ephemeral: true });
    const member = await ((_a = i.guild) === null || _a === void 0 ? void 0 : _a.members.fetch(i.user.id));
    if (!member || !member.roles.cache.has(GCBouncerRole)) {
        await i.editReply({ content: 'You dont have permission to use this command.' });
    }
    else {
        const role = i.options.getString('role', true);
        const user = i.options.getUser('user', true);
        const target = await ((_b = i.guild) === null || _b === void 0 ? void 0 : _b.members.fetch(user.id));
        if (!target) {
            await i.editReply({ content: "Unable to get the mentioned user in the server." });
        }
        else {
            switch (role) {
                case "gc":
                    if (!target.roles.cache.has(GCRole)) {
                        target.roles.add(GCRole);
                        await i.editReply({ content: `Assigned ${target}, the gc role.` });
                    }
                    else {
                        await i.editReply({ content: 'Unable to assign GC role, Reason: \`the user already have that role.\`' });
                    }
            }
        }
    }
});
