import { TextChannel, User } from "discord.js"
import { Log } from "../utils/logging"
import CoreClient from "../bootstrap/CoreClient"
interface Muted {
	userId: string,
	muteType: string
}
interface Replacement {
    [key: string]: string | ((word: string) => string);
}


const muteSettings = {
    meowify: {
        verb: 'Meowified',
        randomReplacePercentage: 0.2,
        randomReplaceValues: [
            'meowww',
            'mrrroww',
            'meow (*X3*)',
            '*meowww__~~__*'
        ],
        postfixValues: [
            '^._.^',
            '(=^･ω･^=)',
            '(ﾐⓛᆽⓛﾐ)✧',
            '/ᐠ｡ꞈ｡ᐟ\\',
        ]
    },
    kryptify: {
        verb: 'Kryptified',
        username: 'Krypt',
        avatarURL: 'https://cdn.discordapp.com/avatars/715653690727596034/69dee52ddfdab3442ce82f6affb23633.png?size=256'
    },
    furry: {
        verb: 'Furrified',
        replacements: {
            'musty': 'musky',
            'ah+': (word: string) => 'mu' + 'r'.repeat(word.length - 1),
            'awesome': 'pawsome',
            'awful': 'pawful',
            'bite': 'nom',
            'bulge': 'bulgy-wulgy',
            'butthole': 'tailhole',
            'bye': 'bai',
            'celebrity': 'popufur',
            'cheese': 'sergal',
            'child': 'cub',
            'kid': 'cub',
            'computer': 'protogen',
            'robot': 'protogen',
            'cyborg': 'protogen',
            'cum': 'cummy wummy~',
            'disease': 'pathOwOgen',
            'dog': 'good boy',
            'dragon': 'derg',
            'eat': 'vore',
            'consume': 'vore',
            'fuck': 'fluff',
            'fuc': 'fluff',
            'father': 'daddy',
            'dad': 'daddy',
            'foot': 'paw',
            'for': 'fur',
            'hand': 'paw',
            'hell': 'hecc',
            'hi': 'hai',
            'hyena': 'yeen',
            'kiss': 'lick',
            'lmao': 'hehe~',
            'love': 'wuv',
            'mouth': 'maw',
            'naughty': 'knotty',
            'not': 'knot',
            'perfect': 'purrfect',
            'persona': 'fursona',
            'pervert': 'furvert',
            'police': 'pawlice',
            'police department': 'Paw Patrol',
            'porn': 'yiff',
            'pron': 'yiff',
            'roar': 'rawr',
            'shout': 'awoo',
            'slut': 'fox',
            'source': 'sauce',
            'straight': 'gay',
            'tale': 'tail',
            'the': 'teh',
            'this': 'dis',
            'toe': 'bean',
            'what': 'wat',
            'with': 'wif',
            'you': 'chu',
            'your': 'ur',
            'forgive me': 'sowwy',
            'sinned': 'naughty',
            'have sex with': 'yiff',
            'old person': 'greymuzzle',
            ',': '~',
            ';': '~',
            '!': 'owo',
            '\\?': 'uwu',
            ':\\)': ':3',
            ':o': 'owo',
            ':O': 'OwO',
            ':0': 'OwO',
            ' °͜ʖ ͡ °': 'OwO',
            ':D': 'UwU',
            'XD': 'X3',

        } as Replacement
    }
}

export const muteTypes = Object.keys(muteSettings)

export const muteMap: Map<string, Muted> = new Map()

export async function applyFunnyMute(user: User, type: string | number, interaction: { reply: (arg0: string) => any; }) {
    const settings = muteSettings[type as keyof typeof muteSettings]
    if (!settings) {
        await interaction.reply(`❌FAILED: Unknown funny mute type: ${type}`)
        return
    }
    const existingRecord = muteMap.get(user.id)
    let res: Muted | null = existingRecord?? null
    if (existingRecord) {
        res = {
           ...existingRecord,
            muteType: type.toString()
        }
    } else {
        res = {
            userId: user.id,
            muteType: type.toString()
        }
        muteMap.set(user.id, res)
    }
    await interaction.reply(`Done! ${settings.verb} ${user.tag} for 5 minutes.`)
    setTimeout(() => {
        muteMap.delete(user.id)
    }, 300000)
}

function isCapital(str: string) {
    return str.toUpperCase() === str
}

function isLower(str: string) {
    return str.toLowerCase() === str
}

function matchCase(str: string, sample: string) {
    if (str.length === sample.length) {
        // Match case
        const letters = []
        for (let i = 0; i < str.length; i++)
            letters[i] = isCapital(sample.charAt(i))? str.charAt(i).toUpperCase() : str.charAt(i).toLowerCase()
        return letters.join()
    } else {
        if (isCapital(sample))
            return str.toUpperCase()
        else if (isLower(sample))
            return str.toLowerCase()
        else if (isCapital(sample.charAt(0)))
            return str.charAt(0).toUpperCase() + str.substr(1)
        else
            return str
    }
}

export async function load(client: CoreClient) {
    client.on('messageCreate', async message => {
        const found = muteMap.get(message.author.id)
        if (!found) {
            return
        }
        // TODO: Check here if found has expired and can be removed (setTimeout may have never run)
		const settings = muteSettings[found.muteType as keyof typeof muteSettings]
        if (!settings)
            return

        let newContent = message.content // DO NOT use raw content, ping vulnerability ( Fragly here :] gonna use raw content anyway, cope )
        let newUsername = message.member?.displayName
        let newAvatar = await message.member?.displayAvatarURL()
        const msgMentions = Array.from(message.mentions.users.values()).map(user => user.id)
        await message.delete()

        // Modify the message
        if ('randomReplacePercentage' in settings) {
            const contentSplit = newContent.split(' ')
            for (let i = 0; i < contentSplit.length; i++) {
                if (Math.random() < settings.randomReplacePercentage && !contentSplit[i].match(/^<@\d+>$/)) {
                    contentSplit[i] = settings.randomReplaceValues[Math.floor(Math.random() * settings.randomReplaceValues.length)]
                }
            }
            newContent = contentSplit.join(' ')
        }
        if ('replacements' in settings) {
            const contentSplit = newContent.split(' ')
            for (let i = 0; i < contentSplit.length; i++) {
                for (const phrase of Object.keys(settings.replacements)) {
                    try {
                        if (contentSplit[i].match(`^${phrase}$`)) {
                            let result = settings.replacements[phrase]
                            if (result instanceof Function)
                                result = result(contentSplit[i])
                            // TODO: Some phrases may be multiple words. In this case,
                            //  they both need to be split up to matchCase and recompiled for the contentSplit
                            contentSplit[i] = matchCase(result, contentSplit[i])
                        }
                    } catch (err) {
                        Log.error(err)
                    }
                }

            }
            newContent = contentSplit.join(' ')
        }
        if ('postfixValues' in settings) {
            newContent += ' ' + settings.postfixValues[Math.floor(Math.random() * settings.postfixValues.length)]
        }
        // Modify the username
        if ('username' in settings) {
            newUsername = settings.username
        }
        // Modify the avatar url
        if ('avatarURL' in settings) {
            newAvatar = settings.avatarURL
        }

        // This timeout is very annoying, not keeping! 
        // try {
        //     await message.member?.timeout(6500).then(() => { // soft timeout
        //         /**
        //         setTimeout(async()=>{
        //             await message.member.timeout(0)
        //         }, 5000)
        //         */
        //     }).catch(err => {
        //         Log.error(err)
        //     })
        // } catch (err) {
        //     Log.error(err)
        // }
        // Send the message
			
			if (message.channel instanceof TextChannel) {
				let webhook = (await message.channel.fetchWebhooks()).find(webhook => webhook.name === 'NESTfunnymuteutil')
				
				if (!webhook) {
					webhook = await message.channel.createWebhook({
						name: 'NESTfunnymuteutil'
					})
				}
				await webhook.send({
					content: newContent,
					username: newUsername,
					avatarURL: newAvatar,
					allowedMentions: { users: msgMentions },
				})
			}
    })
}
