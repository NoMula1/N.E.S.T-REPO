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
		roleid: '999381854471848126',
		reactionid: '1255640175736782991',
		congratulatory: true
	},
	{
		name: 'Intermediate Educator',
		roleid: '1242606206808358973',
		reactionid: '1255641090413822077',
		congratulatory: true
	},
	{
		name: 'Expert Educator',
		roleid: '1162978239522811934',
		reactionid: '1255641116834005023',
		congratulatory: true
	},
	{
		name: 'Master Educator',
		roleid: '1193331902380249168',
		reactionid: '1255645992439517224',
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
