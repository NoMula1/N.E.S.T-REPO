"use strict";
// A file used for adding dynamic developer roles as well as their equivelent reactions for moderators to add them
// See `events/RoleReactions.ts` for full implementation
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactionRoleConfig = void 0;
exports.getRoleByReaction = getRoleByReaction;
/**
 * ~ NOTE
 *
 * Anyone with 'Manage Messages' has access to these role reactions
 * This feature is not for sensitive role usage.
 */
exports.ReactionRoleConfig = [
    {
        name: 'Novice Educator',
        roleid: '',
        reactionid: '',
        congratulatory: true
    },
    {
        name: 'Intermediate Educator',
        roleid: '',
        reactionid: '',
        congratulatory: true
    },
    {
        name: 'Expert Educator',
        roleid: '',
        reactionid: '',
        congratulatory: true
    },
    {
        name: 'Master Educator',
        roleid: '',
        reactionid: '',
        congratulatory: true
    },
    /*{ // Does not exist. Retired role?
        name: 'Ultra Helper',
        roleid: '1242606206808358973',
        reactionid: '1242196173780156436',
        congratulatory: true
    },*/
    /*{ // Does not exist. Retired role?
        name: 'Mega Helper',
        roleid: '1162978239522811934',
        reactionid: '1242196172513349783',
        congratulatory: true
    },*/
];
function getRoleByReaction(reactionId) {
    for (const reactionChunk of exports.ReactionRoleConfig) {
        if (reactionChunk.reactionid === reactionId)
            return reactionChunk;
    }
    return null;
}
