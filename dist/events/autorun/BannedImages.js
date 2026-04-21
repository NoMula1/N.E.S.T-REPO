"use strict";
/*import { Attachment, EmbedBuilder, Events, GuildBasedChannel, Message, Role, TextChannel } from "discord.js";
import { EventOptions } from "../../utils/RegisterEvents";
import path from "path";
import { readdir, readFile } from 'fs/promises';
import { Log } from "../../utils/logging";
import imagesEqual from 'image-equal';
import Settings from "../../schemas/Settings";
import { Scope } from "../../bootstrap/GlobalScope";

const bannedDir = path.join(__dirname, "..", "..", "content", "banned_images")

let logsWarned = false

function isImage(attachment: Attachment): boolean {
    return attachment.contentType?.startsWith("image/") === true
}

type BannedResult = [false] | [true, number, string, string]

async function isImageBanned(url: string, threshold: number): Promise<BannedResult> {
    return [false] //FIXME: this is broken and was pushed to prod
    for (const bannedFilename of await readdir(bannedDir)) {
        const bannedImage = await readFile(path.join(bannedDir, bannedFilename))
        if (imagesEqual(bannedImage, url, threshold)) {
            // fixme: imagesEqual is not providing the amount, need to fix
            Log.debug(`Image ${url} matches banned image: ${bannedFilename}`) //  (by ${diff.amount*100.0}%)
            return [true, 0, url, bannedFilename]
        }
    }
    return [false]
}

export default {
    name: Events.MessageCreate,
    scope: Scope.Admin,
    once: false,
    async execute(_: EventOptions, message: Message) {
        try {
            // Staff are immune from image bans
            if (message.member?.roles?.cache?.find((r: Role) => { r.name.toLowerCase() === "staff" }) !== undefined) return;
            const logsChannel = message?.guild?.channels.cache.find((c: GuildBasedChannel) => c.name.toLowerCase() === "logs")
            if (!logsChannel) {
                if (!logsWarned) {
                    Log.warn("Unable to find cached logs channel. Image Bans will not apply.")
                    logsWarned = true
                }
                return;
            }
            const bannedThreshold = (await Settings.findOne({
                guildID: message.guildId
            }))?.bannedImagesThreshold || 0.6
            let bannedResult: BannedResult = [false]
            for (const attachment of message.attachments.values()) {
                if (!isImage(attachment)) continue
                bannedResult = await isImageBanned(attachment.url, bannedThreshold)
                if (bannedResult[0])
                    break
            }
            if (bannedResult[0]) {
                const logEmbed = new EmbedBuilder()
                    .setAuthor({ name: "Image Banned" })
                    .setDescription(`**Banned sample:** ${bannedResult[3]}`) // \n**Matched by:** ${bannedResult[1]*100.0}%
                    .setColor("Green")
                    .setImage("attachment://" + path.basename(new URL(bannedResult[2]).pathname))
                await (logsChannel as TextChannel).send({ embeds: [logEmbed], files: [bannedResult[2]] })
                await message.delete()
            }
        } catch (e) {
            Log.error(`Unable to check if attached images are banned: ${e}`)
        }
    }
}
*/ 
