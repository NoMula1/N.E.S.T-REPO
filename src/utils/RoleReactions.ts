// A file used for adding dynamic developer roles as well as their equivelent reactions for moderators to add them
// See `events/RoleReactions.ts` for full implementation

type reactionRoleChunk = {
	name: string;
	roleid: string;
	reactionid: string;
	congratulatory: boolean; // Whether or not NEST should congratulate the user for this role addition
}

/**
 * ~ NOTE
 * 
 * Anyone with 'Manage Messages' has access to these role reactions
 * This feature is not for sensitive role usage.
 */
export const ReactionRoleConfig: reactionRoleChunk[] = [
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
]

export function getRoleByReaction(reactionId: string): reactionRoleChunk | null {
	for (const reactionChunk of ReactionRoleConfig) {
		if (reactionChunk.reactionid === reactionId)
			return reactionChunk
	}

	return null
}
