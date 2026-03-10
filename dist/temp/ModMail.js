"use strict";
/*import { APIMessageActionRowComponent,CategoryChannel, ChannelType, Events, Message, TextChannel, EmbedBuilder, MessageType, ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ModalBuilder, APIActionRowComponent } from "discord.js";
import ModMail from "../schemas/ModMail";
export default {
    name: Events.MessageCreate,
    once: false,
    async execute(message: Message) {

        if (message.channel.type === ChannelType.DM && message.author.id !== '839572270753775676') {
            const channel = message.client.channels.cache.get('1211059416481140736') as TextChannel;

            if (!channel) {
                console.error("Channel does not exist");
                return;
            }
            await message.react('✅')
            
            const sentEmbed = new EmbedBuilder()
                .setTitle("ModMail")
                .setColor("Blurple")
                .setDescription("Your message was sent");
            const embed = new EmbedBuilder()
                .setTitle('ModMail')
                .setDescription(message.content)
                .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                .setTimestamp()
                .setFooter({ text: `${message.author.tag}`});
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('send_message')
                        .setLabel('Send Message?')
                        .setStyle(ButtonStyle.Primary),
                );
              
            const newModMailUser = new ModMail({
                userID: message.author.id
            });
            newModMailUser.save().then(() => {
                console.log("ModMailUser saved successfully.");
            }).catch((error) => {
                console.error("Failed to save ModMailUser:", error);
            });
            await message.reply({ embeds: [sentEmbed]})
            channel.send({ embeds: [embed], components: [row as unknown as APIActionRowComponent<APIMessageActionRowComponent>] }).then(sentMessage => {
                newModMailUser.messageID = sentMessage.id;
                newModMailUser.save().then().catch((error) => {
                    console.error("Failed to save ", error);
                });
            }).catch((error) => {
                console.error("Failed to send embed:", error);
            });
        }
    }
};
*/ 
