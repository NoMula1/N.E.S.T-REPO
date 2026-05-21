"use strict";
/*import { ModalSubmitInteraction, TextInputStyle, TextInputBuilder, APIMessageActionRowComponent, CategoryChannel, ChannelType, Events, Message, TextChannel, EmbedBuilder, MessageType, ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ModalBuilder, APIActionRowComponent, Interaction, CacheType } from "discord.js";
import ModMail from "../schemas/ModMail";
import { handleError } from "../utils/GenUtils";
export default {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction : Interaction) {
        if (!interaction.isButton() && !interaction.isModalSubmit()) {
            return;
        }
        if (!interaction.channel) {
            console.log("No channel found");
            return;
        }
        if (interaction.isButton()) {
            console.log("button interaction initiated");
            
            if (interaction.customId === 'send_message') {
                console.log("Button customId is send_message");
                const modal = new ModalBuilder()
                    .setTitle('Respond')
                    .setCustomId("modal_respond");
                const modalInputs = [new TextInputBuilder()
                    .setCustomId("modal_response")
                    .setLabel("Response")
                    .setRequired(true)
                    .setMaxLength(255)
                    .setStyle(TextInputStyle.Paragraph)
                ]
                for (const inputs of modalInputs)
                    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().setComponents(inputs));
                console.log("Modal created");
                await interaction.showModal(modal);
            }
        } else if (interaction.isModalSubmit()) {
            console.log("Modal submit interaction");
            const modalInteraction = interaction as ModalSubmitInteraction;
            if (!modalInteraction.channel) {
                console.log("Modal interaction has no channel");
                return;
            }
            const foundCase = await ModMail.findOne({ messageID: interaction.message?.id }).catch((err: Error) => {
                handleError(err);
            });
            if (!foundCase || !foundCase.userID) {return;}
            const caseUser = await client.users.fetch(foundCase.userID);
            if (!caseUser) {
                interaction.reply({ content: "error user not found", ephemeral: true});
                return;
            }
            if (modalInteraction.customId === 'modal_respond') {
                const description = modalInteraction.fields.getTextInputValue("modal_response");
                const embedDescription = new EmbedBuilder()
                    .setTitle("New Reply")
                    .setColor('Yellow')
                    .setAuthor({ name: `${modalInteraction.user.username}`})
                    .setDescription(`${description}`);
                const user = interaction.fields.components;
                await caseUser.send({ embeds: [embedDescription]})
                await modalInteraction.reply({ content: "Reply submitted!", ephemeral: true });
            };
        }
    }
};*/ 
