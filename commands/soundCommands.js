const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const audioService = require('../services/audioService');
const soundUtils = require('../utils/soundUtils');
const embedUtils = require('../utils/embedUtils');
const stateManager = require('../utils/stateManager');
const { PREFIX } = require('../utils/constants');

const prefix = PREFIX;

class SoundCommands {
    async handleSoundCommand(message, content) {
        const soundName = content.substring(prefix.length);
        await audioService.playSound(message, soundName, false, false);
    }

    async handleStop(message) {
        await audioService.stopSound();
        
        const state = stateManager.getSoundboardState();
        if (state.inSoundboardMenu && stateManager.getCurrentInteraction()) {
            try {
                const embed = embedUtils.createStatusEmbed("Sound gestoppt", false);
                await stateManager.getCurrentInteraction().editReply({ embeds: [embed] });
            } catch (error) {
                console.error('Fehler beim Aktualisieren der Antwort:', error);
            }
        }
    }

    async sendMainMenu(interaction) {
        stateManager.updateSoundboardState({
            inTop20Menu: true,
            inSoundboardMenu: false,
            inHelpMenu: false
        });
        
        stateManager.setCurrentInteraction(interaction);

        const favoriteSounds = soundUtils.getFavoriteSounds().slice(0, 10);
        const newestSounds = soundUtils.getNewestSounds();
        const actionRows = this.createMainMenuRows(favoriteSounds, newestSounds);

        const mainMenuEmbed = embedUtils.createStatusEmbed("Menü | Top 10");
        const replyOptions = { 
            embeds: [mainMenuEmbed], 
            components: actionRows, 
            allowedMentions: { parse: [] } 
        };

        if (interaction.deferred || interaction.replied) {
            await interaction.editReply(replyOptions);
        } else if (interaction.update) {
            await interaction.update(replyOptions);
        } else {
            await interaction.reply(replyOptions);
        }
    }

    async sendSoundboardMenu(interaction, pageIndex) {
        stateManager.updateSoundboardState({
            inTop20Menu: false,
            inSoundboardMenu: true,
            inHelpMenu: false,
            currentPageIndex: pageIndex
        });

        const soundboardButtons = soundUtils.getSoundboardButtons();
        const paginatedButtons = soundUtils.paginateButtons(soundboardButtons);
        const totalPages = Math.ceil(paginatedButtons.length);
        
        const soundboardEmbed = embedUtils.createStatusEmbed(`A - Z | Seite ${pageIndex + 1} von ${totalPages}`);
        const currentPageButtons = paginatedButtons[pageIndex] || [];
        const rows = this.createButtonRows(currentPageButtons, 5);
        const navigationRow = this.createNavigationRow(pageIndex, paginatedButtons.length);
        rows.push(navigationRow);

        await interaction.update({ embeds: [soundboardEmbed], components: rows });
    }

    async sendHelpMenu(interaction, page) {
        stateManager.updateSoundboardState({
            inTop20Menu: false,
            inSoundboardMenu: false,
            inHelpMenu: true,
            currentHelpPageIndex: page
        });
        
        const { codeBlock, totalPages } = soundUtils.getPaginatedSoundsList(page, 60);

        const helpEmbed = new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle(`Hilfe | Seite ${page} von ${totalPages}`)
            .setDescription('Hier finden Sie eine Übersicht über unsere Soundclips.\n\n' + codeBlock);

        const paginationButtons = this.createPaginationButtons(page, totalPages);
        const update = {
            embeds: [helpEmbed],
            components: paginationButtons,
            allowedMentions: { parse: [] }
        };
        
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply(update);
        } else {
            await interaction.reply({ ...update, allowedMentions: { parse: [] } });
        }
    }

    async handleButtonInteraction(interaction) {
        const customId = interaction.customId;

        if (customId === 'help_menu') {
            await interaction.deferUpdate();
            await this.sendHelpMenu(interaction, 1);
        } else if (customId === 'main_menu') {
            await this.sendMainMenu(interaction);
        } else if (customId.startsWith('next_page_') || customId.startsWith('prev_page_')) {
            const page = parseInt(customId.split('_')[2]);
            await interaction.deferUpdate();
            await this.sendHelpMenu(interaction, page);
        } else if (customId.startsWith('fav_play_sound_')) {
            const soundName = customId.split('_').slice(3, -1).join('_');
            await audioService.playSoundWithoutCounting(interaction, soundName);
        } else if (customId === 'sound_stop') {
            await audioService.stopSound();
            await interaction.deferUpdate();
        } else if (customId.startsWith('sound_')) {
            const soundName = customId.replace('sound_', '');
            await audioService.playSound(interaction, soundName, true, true);
        } else if (customId.startsWith('newest_play_sound_')) {
            const soundNameWithIndex = customId.replace('newest_play_sound_', '');
            const soundName = soundNameWithIndex.substring(0, soundNameWithIndex.lastIndexOf('_'));
            await audioService.playSound(interaction, soundName, true, false);
        } else if (customId === 'disconnect') {
            await this.handleDisconnect(interaction);
        } else {
            await this.handleNavigationButtons(customId, interaction);
        }
    }

    async handleNavigationButtons(customId, interaction) {
        switch (customId) {
            case 'soundboard':
                await this.sendSoundboardMenu(interaction, stateManager.currentPageIndex);
                break;
            case 'back-to-main':
                await this.sendMainMenu(interaction);
                break;
            case 'random_sound':
                await audioService.playRandomSound(interaction);
                break;
            case 'next-page':
                stateManager.currentPageIndex++;
                await this.sendSoundboardMenu(interaction, stateManager.currentPageIndex);
                break;
            case 'previous-page':
                if (stateManager.currentPageIndex > 0) {
                    stateManager.currentPageIndex--;
                    await this.sendSoundboardMenu(interaction, stateManager.currentPageIndex);
                }
                break;
        }
    }

    async handleDisconnect(interaction) {
        await audioService.disconnect();

        const updatedEmbed = embedUtils.createStatusEmbed("Menü | Top 10");
        await interaction.update({ embeds: [updatedEmbed] });

        const message = await interaction.followUp({ content: 'Bot getrennt.' });
        setTimeout(() => {
            if (message.deletable) {
                message.delete().catch(console.error);
            }
        }, 3000);
    }

    // Helper Methods
    createMainMenuRows(favoriteSounds, newestSounds) {
        const actionRows = [];

        // Favorite Buttons
        if (favoriteSounds.length > 0) {
            const favoriteButtons = favoriteSounds.map((soundName, index) => {
                const safeSoundName = soundName || `sound${index}`;
                return new ButtonBuilder()
                    .setCustomId(`fav_play_sound_${safeSoundName}_${index}`)
                    .setLabel(safeSoundName)
                    .setStyle(ButtonStyle.Secondary);
            }).filter(btn => btn.data.label);

            if (favoriteButtons.length > 0) {
                actionRows.push(new ActionRowBuilder().addComponents(favoriteButtons.slice(0, 5)));
                if (favoriteButtons.length > 5) {
                    actionRows.push(new ActionRowBuilder().addComponents(favoriteButtons.slice(5, 10)));
                }
            }
        }

        // Newest Buttons
        const newestButtons = newestSounds.map((soundName, index) => {
            const safeSoundName = soundName || `sound${index}`;
            return new ButtonBuilder()
                .setCustomId(`newest_play_sound_${safeSoundName}_${index}`)
                .setLabel(safeSoundName)
                .setStyle(ButtonStyle.Success);
        }).filter(btn => btn.data.label);

        const newestSeparator = new ButtonBuilder()
            .setCustomId(`newest_separator`)
            .setLabel('Neu →')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true);

        if (newestButtons.length > 0) {
            actionRows.push(new ActionRowBuilder().addComponents(newestSeparator, ...newestButtons.slice(0, 4)));
            if (newestButtons.length > 4) {
                actionRows.push(new ActionRowBuilder().addComponents(...newestButtons.slice(4, Math.min(newestButtons.length, 9))));
            }
        }

        // Navigation Buttons
        const navigationRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('soundboard').setLabel('A - Z').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('help_menu').setLabel('Hilfe').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('random_sound').setLabel('Zufall').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('sound_stop').setLabel('Stopp').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('disconnect').setLabel('X').setStyle(ButtonStyle.Danger)
        );
        actionRows.push(navigationRow);

        return actionRows;
    }

    createButtonRows(buttons, buttonsPerRow) {
        const rows = [];
        for (let i = 0; i < buttons.length; i += buttonsPerRow) {
            const rowButtons = buttons.slice(i, i + buttonsPerRow).map(btn => 
                new ButtonBuilder()
                    .setCustomId(btn.customId)
                    .setLabel(btn.label)
                    .setStyle(ButtonStyle.Secondary)
            );
            rows.push(new ActionRowBuilder().addComponents(rowButtons));
        }
        return rows;
    }

    createNavigationRow(currentPageIndex, totalPages) {
        const navigationButtons = [
            new ButtonBuilder().setCustomId('back-to-main').setLabel('Menü').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('previous-page').setLabel('←').setStyle(ButtonStyle.Primary).setDisabled(currentPageIndex === 0),
            new ButtonBuilder().setCustomId('next-page').setLabel('→').setStyle(ButtonStyle.Primary).setDisabled(currentPageIndex >= totalPages - 1),
            new ButtonBuilder().setCustomId('sound_stop').setLabel('Stopp').setStyle(ButtonStyle.Danger)
        ];
        return new ActionRowBuilder().addComponents(navigationButtons);
    }

    createPaginationButtons(currentPage, totalPages) {
        const prevButton = new ButtonBuilder()
            .setCustomId(`prev_page_${currentPage - 1}`)
            .setLabel('←')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage === 1);

        const nextButton = new ButtonBuilder()
            .setCustomId(`next_page_${currentPage + 1}`)
            .setLabel('→')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage === totalPages);

        const menuButton = new ButtonBuilder()
            .setCustomId('main_menu')
            .setLabel('Menü')
            .setStyle(ButtonStyle.Primary);

        return [new ActionRowBuilder().addComponents(menuButton, prevButton, nextButton)];
    }
}

module.exports = new SoundCommands();