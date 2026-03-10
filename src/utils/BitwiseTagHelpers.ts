// A file that contains various helper functions for tags on posts

import { StringSelectMenuOptionBuilder } from "discord.js";
import PostTemplates from "../schemas/PostTemplates";

export function addBwTag(original: bigint, toAdd: bigint): bigint {
    return original | toAdd;
}

export function stripBwTag(original: bigint, toStrip: bigint): bigint {
    return original & ~toStrip;
}

/**
 * The individual StringSelectMenuOptions' values will be set to the tag name from TagAssociation
 */
export function tagGroupAsOptions() {
    return Object.keys(TagAssociation).map((groupName) =>
        new StringSelectMenuOptionBuilder()
            .setLabel(`${TagGroupEmoji[groupName]} ${groupName.replace("_", " ")}`)
            .setValue(groupName)
            .setDescription(`Groupings which contain ${groupName.replace("_", " ")}`)
    );
}

function countSetBits(n: bigint): number {
    let count = 0;
    while (n > BigInt(0)) {
        count += Number(n & BigInt(1));
        n >>= BigInt(1);
    }
    return count;
}

export async function searchPostsWithTags(selectedTags: bigint) {
    const posts = await PostTemplates.find({
        bitwiseTags: { $bitsAnySet: Number(selectedTags) }, // MongoDB does not support BigInt, use Number
    });

    const matchingPosts = posts.map((post) => {
        const matchBits = BigInt(post.bitwiseTags) & selectedTags;
        const similarityScore = countSetBits(matchBits);
        console.log(post.bitwiseTags, similarityScore);
        return { post, similarityScore };
    });

    matchingPosts.sort((a, b) => b.similarityScore - a.similarityScore);

    return matchingPosts;
}


export const TagGroupEmoji: any = {
	Skill_Roles: "🧠",
	Job_Type: "💼",
	Payment_Type: "💸",
	Job_Length: "⏳",
	Payment_Value: "💰",
	Skill_Type: "🤹"
}

export const TagAssociation: any = {
    Skill_Roles: {
        Novice: BigInt(1) << BigInt(1),
        Intermediate: BigInt(1) << BigInt(2),
        Expert: BigInt(1) << BigInt(3),
        Master: BigInt(1) << BigInt(4),
    },
    Job_Type: {
        Hiring: BigInt(1) << BigInt(5),
        For_Hire: BigInt(1) << BigInt(6),
        Selling: BigInt(1) << BigInt(7),
    },
    Payment_Type: {
        Robux: BigInt(1) << BigInt(8),
        USD: BigInt(1) << BigInt(9),
        Nitro: BigInt(1) << BigInt(10),
        Other: BigInt(1) << BigInt(11),
    },
    Job_Length: {
        Short_Term: BigInt(1) << BigInt(12),
        Long_Term: BigInt(1) << BigInt(13),
        Commission: BigInt(1) << BigInt(14),
        Full_Time: BigInt(1) << BigInt(15),
        Part_Time: BigInt(1) << BigInt(16),
    },
    Payment_Value: {
        Percentage: BigInt(1) << BigInt(17),
        Low_Payment: BigInt(1) << BigInt(18),
        Medium_Payment: BigInt(1) << BigInt(19),
        High_Payment: BigInt(1) << BigInt(20),
    },
    Skill_Type: {
        Scripter: BigInt(1) << BigInt(21),
        Builder: BigInt(1) << BigInt(22),
        VFX: BigInt(1) << BigInt(23),
        GFX: BigInt(1) << BigInt(24),
        UI_UX: BigInt(1) << BigInt(25),
        Music: BigInt(1) << BigInt(26),
        SFX: BigInt(1) << BigInt(27),
        Clothing: BigInt(1) << BigInt(28),
        Discord_Bot_Dev: BigInt(1) << BigInt(29),
        Web_Dev: BigInt(1) << BigInt(30),
        Tester: BigInt(1) << BigInt(31),
        Project_Management: BigInt(1) << BigInt(32),
	Modeling: BigInt(1) << BigInt(33),
	Animation: BigInt(1) << BigInt(34),
        Other: BigInt(1) << BigInt(35),
    },
}
