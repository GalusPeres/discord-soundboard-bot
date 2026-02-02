const { ButtonBuilder, ActionRowBuilder, ButtonStyle, ComponentType, MessageFlags, StringSelectMenuBuilder } = require('discord.js');
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
        const { favoriteRows, newestRows, navigationRow } = this.createMainMenuRows(favoriteSounds, newestSounds);

        const extraComponents = [];
        if (favoriteRows.length > 0) {
            extraComponents.push({ type: ComponentType.TextDisplay, content: '### Top 10' }, ...favoriteRows);
        }

        if (newestRows.length > 0) {
            if (extraComponents.length > 0) {
                extraComponents.push({ type: ComponentType.Separator });
            }
            extraComponents.push({ type: ComponentType.TextDisplay, content: '### Neu' }, ...newestRows);
        }

        if (navigationRow) {
            if (extraComponents.length > 0) {
                extraComponents.push({ type: ComponentType.Separator });
            }
            extraComponents.push(navigationRow);
        }
        stateManager.setCurrentComponents(extraComponents);
        const menuComponents = embedUtils.createMenuComponents("## Übersicht", extraComponents);
        const replyOptions = { 
            components: menuComponents, 
            allowedMentions: { parse: [] },
            flags: MessageFlags.IsComponentsV2
        };

        let messageRef = null;
        const isMessage = interaction?.constructor?.name === 'Message';
        if (isMessage && interaction.channel) {
            messageRef = await interaction.channel.send(replyOptions);
        } else if (interaction.deferred || interaction.replied) {
            messageRef = await interaction.editReply(replyOptions);
        } else if (interaction.update) {
            await interaction.update(replyOptions);
            messageRef = interaction.message;
        } else if (interaction.fetchReply) {
            await interaction.reply({ ...replyOptions, fetchReply: true });
            messageRef = await interaction.fetchReply();
        } else {
            messageRef = await interaction.reply(replyOptions);
        }

        if (messageRef) {
            stateManager.setMessageState(messageRef, 'overview', extraComponents);
        }
    }

    async sendSoundboardMenu(interaction, pageIndex) {
        stateManager.updateSoundboardState({
            inTop20Menu: false,
            inSoundboardMenu: true,
            inHelpMenu: false,
            currentPageIndex: pageIndex
        });
        stateManager.currentPageIndex = pageIndex;

        const soundboardButtons = soundUtils.getSoundboardButtons();
        const paginatedButtons = soundUtils.paginateButtons(soundboardButtons);
        const totalPages = Math.ceil(paginatedButtons.length);
        
        const currentPageButtons = paginatedButtons[pageIndex] || [];
        const rows = this.createButtonRows(currentPageButtons, 5);
        const navigationRow = this.createNavigationRow(pageIndex, paginatedButtons.length);
        const pageSelectRow = this.createPageSelectRow(pageIndex, totalPages);
        const divider = { type: ComponentType.Separator };
        const pageInfo = `### Seite ${pageIndex + 1} von ${totalPages}`;
        const extraComponents = [];
        if (pageSelectRow) {
            extraComponents.push(pageSelectRow);
        } else {
            extraComponents.push({ type: ComponentType.TextDisplay, content: pageInfo });
        }
        extraComponents.push(...rows, divider, navigationRow);
        stateManager.setCurrentComponents(extraComponents);
        const menuComponents = embedUtils.createMenuComponents("## A - Z", extraComponents);

        await interaction.update({
            components: menuComponents,
            flags: MessageFlags.IsComponentsV2
        });
        if (interaction.message) {
            stateManager.setMessageState(interaction.message, 'az', extraComponents);
        }
    }

    async sendHelpMenu(interaction, page) {
        stateManager.updateSoundboardState({
            inTop20Menu: false,
            inSoundboardMenu: false,
            inHelpMenu: true,
            currentHelpPageIndex: page
        });
        
        const { codeBlock, totalPages } = soundUtils.getPaginatedSoundsList(page, 60);
        const helpPageInfo = `### Seite ${page} von ${totalPages}\n${codeBlock}`;
        const helpPageSelectRow = this.createHelpPageSelectRow(page, totalPages);
        const paginationButtons = this.createPaginationButtons(page, totalPages);
        const extraComponents = [];
        if (helpPageSelectRow) {
            extraComponents.push(helpPageSelectRow);
            extraComponents.push({ type: ComponentType.TextDisplay, content: codeBlock });
        } else {
            extraComponents.push({ type: ComponentType.TextDisplay, content: helpPageInfo });
        }
        extraComponents.push({ type: ComponentType.Separator }, ...paginationButtons);
        stateManager.setCurrentComponents(extraComponents);
        const menuComponents = embedUtils.createMenuComponents("## Hilfe", extraComponents);
        const update = {
            components: menuComponents,
            allowedMentions: { parse: [] },
            flags: MessageFlags.IsComponentsV2
        };
        
        let messageRef = null;
        const isMessage = interaction?.constructor?.name === 'Message';
        const isComponentInteraction = typeof interaction.isButton === 'function'
            && (interaction.isButton() || interaction.isStringSelectMenu());

        if (isMessage && interaction.channel) {
            messageRef = await interaction.channel.send({ ...update, allowedMentions: { parse: [] } });
        } else if (isComponentInteraction && !interaction.deferred && !interaction.replied && typeof interaction.update === 'function') {
            await interaction.update(update);
            messageRef = interaction.message;
        } else if (interaction.deferred || interaction.replied) {
            messageRef = await interaction.editReply(update);
        } else if (interaction.fetchReply) {
            await interaction.reply({ ...update, fetchReply: true });
            messageRef = await interaction.fetchReply();
        } else {
            messageRef = await interaction.reply({ ...update, allowedMentions: { parse: [] } });
        }
        if (messageRef) {
            stateManager.setMessageState(messageRef, 'help', extraComponents);
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
            await this.deferComponentInteraction(interaction);
            await audioService.playSound(interaction, soundName, false, true);
        } else if (customId.startsWith('newest_play_sound_')) {
            const soundNameWithIndex = customId.replace('newest_play_sound_', '');
            const soundName = soundNameWithIndex.substring(0, soundNameWithIndex.lastIndexOf('_'));
            await this.deferComponentInteraction(interaction);
            await audioService.playSound(interaction, soundName, false, false);
        } else if (customId === 'disconnect') {
            await this.handleDisconnect(interaction);
        } else {
            await this.handleNavigationButtons(customId, interaction);
        }
    }

    async handleSelectMenuInteraction(interaction) {
        const rawValue = interaction.values?.[0] ?? '';
        const pageNumber = parseInt(rawValue.replace('page_', ''), 10);
        
        if (interaction.customId === 'soundboard_page_select') {
            if (Number.isNaN(pageNumber)) {
                await interaction.deferUpdate();
                return;
            }
            await this.sendSoundboardMenu(interaction, Math.max(0, pageNumber - 1));
            return;
        }

        if (interaction.customId === 'help_page_select') {
            if (Number.isNaN(pageNumber)) {
                await interaction.deferUpdate();
                return;
            }
            await this.sendHelpMenu(interaction, Math.max(1, pageNumber));
            return;
        }

        await interaction.deferUpdate();
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
                await this.deferComponentInteraction(interaction);
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

        await this.sendMainMenu(interaction);

        const message = await interaction.followUp({ content: 'Bot getrennt.' });
        setTimeout(() => {
            if (message.deletable) {
                message.delete().catch(console.error);
            }
        }, 3000);
    }

    // Helper Methods

    deferComponentInteraction(interaction) {
        if (!interaction || typeof interaction.deferUpdate !== 'function') {
            return;
        }
        if (interaction.deferred || interaction.replied) {
            return;
        }
        try {
            interaction.deferUpdate().catch(() => {});
        } catch (error) {
            // Ignore defer errors to avoid breaking playback flow.
        }
    }

    createMainMenuRows(favoriteSounds, newestSounds) {
        const favoriteRows = [];

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
                favoriteRows.push(new ActionRowBuilder().addComponents(favoriteButtons.slice(0, 5)));
                if (favoriteButtons.length > 5) {
                    favoriteRows.push(new ActionRowBuilder().addComponents(favoriteButtons.slice(5, 10)));
                }
            }
        }

        // Newest Buttons
        const newestButtons = newestSounds.slice(0, 10).map((soundName, index) => {
            const safeSoundName = soundName || `sound${index}`;
            return new ButtonBuilder()
                .setCustomId(`newest_play_sound_${safeSoundName}_${index}`)
                .setLabel(safeSoundName)
                .setStyle(ButtonStyle.Success);
        }).filter(btn => btn.data.label);

        const newestRows = [];
        if (newestButtons.length > 0) {
            newestRows.push(new ActionRowBuilder().addComponents(newestButtons.slice(0, 5)));
            if (newestButtons.length > 5) {
                newestRows.push(new ActionRowBuilder().addComponents(newestButtons.slice(5, 10)));
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

        return { favoriteRows, newestRows, navigationRow };
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
            new ButtonBuilder().setCustomId('back-to-main').setLabel('Übersicht').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('previous-page').setLabel('←').setStyle(ButtonStyle.Primary).setDisabled(currentPageIndex === 0),
            new ButtonBuilder().setCustomId('next-page').setLabel('→').setStyle(ButtonStyle.Primary).setDisabled(currentPageIndex >= totalPages - 1),
            new ButtonBuilder().setCustomId('sound_stop').setLabel('Stopp').setStyle(ButtonStyle.Danger)
        ];
        return new ActionRowBuilder().addComponents(navigationButtons);
    }

    createPageSelectRow(currentPageIndex, totalPages) {
        if (totalPages <= 1) {
            return null;
        }

        const maxOptions = 25;
        const currentPage = currentPageIndex + 1;
        let start = Math.max(1, currentPage - Math.floor(maxOptions / 2));
        let end = Math.min(totalPages, start + maxOptions - 1);
        start = Math.max(1, end - maxOptions + 1);

        const options = [];
        for (let page = start; page <= end; page++) {
            options.push({
                label: `Seite ${page}`,
                value: `page_${page}`,
                default: page === currentPage
            });
        }

        const select = new StringSelectMenuBuilder()
            .setCustomId('soundboard_page_select')
            .setPlaceholder(`Seite ${currentPage} von ${totalPages}`)
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(options);

        return new ActionRowBuilder().addComponents(select);
    }

    createHelpPageSelectRow(currentPage, totalPages) {
        if (totalPages <= 1) {
            return null;
        }

        const maxOptions = 25;
        let start = Math.max(1, currentPage - Math.floor(maxOptions / 2));
        let end = Math.min(totalPages, start + maxOptions - 1);
        start = Math.max(1, end - maxOptions + 1);

        const options = [];
        for (let page = start; page <= end; page++) {
            options.push({
                label: `Seite ${page}`,
                value: `page_${page}`,
                default: page === currentPage
            });
        }

        const select = new StringSelectMenuBuilder()
            .setCustomId('help_page_select')
            .setPlaceholder(`Seite ${currentPage} von ${totalPages}`)
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(options);

        return new ActionRowBuilder().addComponents(select);
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
            .setLabel('Übersicht')
            .setStyle(ButtonStyle.Primary);

        return [new ActionRowBuilder().addComponents(menuButton, prevButton, nextButton)];
    }
}

module.exports = new SoundCommands();
