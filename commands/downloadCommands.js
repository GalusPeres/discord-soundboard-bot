const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const path = require('path');
const fs = require('fs');
const soundUtils = require('../utils/soundUtils');
const zipService = require('../services/zipService');
const { SOUND_LOGS_PATH } = require('../utils/constants');

class DownloadCommands {
    async handleDownload(message) {
        try {
            // DIREKT ERSTE SOUND-SEITE - KEIN AUSWAHLMENÜ!
            const soundButtons = soundUtils.getSoundboardButtons();
            const soundsPerPageDownload = 20;
            const totalPages = Math.ceil(soundButtons.length / soundsPerPageDownload);
            
            const pageSounds = soundButtons.slice(0, soundsPerPageDownload); // Erste 20 Sounds

            // Berechne Ordner-Größe
            const { SOUNDS_DIR } = require('../utils/constants');
            let totalSize = 0;
            if (fs.existsSync(SOUNDS_DIR)) {
                const files = fs.readdirSync(SOUNDS_DIR).filter(f => f.endsWith('.mp3'));
                totalSize = files.reduce((sum, file) => {
                    const stats = fs.statSync(path.join(SOUNDS_DIR, file));
                    return sum + stats.size;
                }, 0);
            }
            const estimatedArchives = Math.ceil(totalSize / (9.98 * 1024 * 1024));

            // ERSTE SOUND-SEITE EMBED
            const downloadEmbed = new EmbedBuilder()
                .setColor(0x00AE86)
                .setTitle(`📥 Download | Seite 1 von ${totalPages}`)
                .setDescription('**Wähle einen Sound oder Alle Sounds**')
                .addFields(
                    { name: '🎵 Verfügbare Sounds', value: `${soundButtons.length} Sounds`, inline: true },
                    { name: '💾 Ordner-Größe', value: `${(totalSize / 1024 / 1024).toFixed(1)} MB`, inline: true },
                    { name: '📦 Archive (bei Komplett-Download)', value: `~${estimatedArchives} Teile`, inline: true }
                );

            const rows = [];
            // Sound-Buttons (4 Reihen à 5 Buttons)
            for (let i = 0; i < pageSounds.length && rows.length < 4; i += 5) {
                const rowButtons = pageSounds.slice(i, i + 5).map(sound => 
                    new ButtonBuilder()
                        .setCustomId(`download_sound_${sound.label}`)
                        .setLabel(sound.label)
                        .setStyle(ButtonStyle.Secondary)
                );
                rows.push(new ActionRowBuilder().addComponents(rowButtons));
            }

            // Navigation + "Alle Sounds" Button
            const navigationButtons = [
                new ButtonBuilder()
                    .setCustomId('download_prev_page')
                    .setLabel('←')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true), // Erste Seite
                new ButtonBuilder()
                    .setCustomId('download_next_page')
                    .setLabel('→')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(totalPages <= 1),
                new ButtonBuilder()
                    .setCustomId('download_all_from_menu')
                    .setLabel('📦 Alle Sounds')
                    .setStyle(ButtonStyle.Success)
            ];

            const navigationRow = new ActionRowBuilder().addComponents(navigationButtons);
            rows.push(navigationRow);

            // DIREKT SENDEN
            await message.author.send({ embeds: [downloadEmbed], components: rows });
            
            const confirmMsg = await message.reply('📥 Ich habe dir das Download-Menü per DM gesendet!');
            setTimeout(() => confirmMsg.delete().catch(console.error), 5000);
            
        } catch (error) {
            console.error('Fehler beim Senden der Download-DM:', error);
            const errorMsg = await message.reply('❌ Konnte dir keine private Nachricht senden. Stelle sicher, dass DMs von Server-Mitgliedern erlaubt sind.');
            setTimeout(() => errorMsg.delete().catch(console.error), 8000);
        }
    }

    async handleButtonInteraction(interaction) {
        const customId = interaction.customId;

        // ALTE BUTTONS → DIREKT ZUR ERSTEN SOUND-SEITE!
        if (customId === 'download_individual' || customId === 'download_confirm') {
            await this.sendDownloadMenu(interaction, 0);
        } else if (customId === 'download_all' || customId === 'download_all_confirm') {
            await interaction.reply({ content: 'Split-Archiv wird erstellt...', ephemeral: false });
            await zipService.createAndSendSplitArchive(interaction);
        } 
        // SOUND-BUTTONS
        else if (customId.startsWith('download_sound_')) {
            const soundName = customId.replace('download_sound_', '');
            await this.handleSoundDownload(interaction, soundName);
        } 
        // NAVIGATION
        else if (customId === 'download_next_page') {
            const currentPage = parseInt(interaction.message.embeds[0].title.match(/Seite (\d+)/)?.[1] || '1') - 1;
            await this.sendDownloadMenu(interaction, currentPage + 1);
        } else if (customId === 'download_prev_page') {
            const currentPage = parseInt(interaction.message.embeds[0].title.match(/Seite (\d+)/)?.[1] || '1') - 1;
            await this.sendDownloadMenu(interaction, currentPage - 1);
        } else if (customId === 'download_all_from_menu') {
            await interaction.reply({ content: 'Split-Archiv wird erstellt...', ephemeral: false });
            await zipService.createAndSendSplitArchive(interaction);
        }
    }

    async sendDownloadMenu(messageOrInteraction, pageIndex) {
        const soundButtons = soundUtils.getSoundboardButtons();
        const soundsPerPageDownload = 20;
        const totalPages = Math.ceil(soundButtons.length / soundsPerPageDownload);
        
        pageIndex = Math.max(0, Math.min(pageIndex, totalPages - 1));
        
        const startIndex = pageIndex * soundsPerPageDownload;
        const pageSounds = soundButtons.slice(startIndex, startIndex + soundsPerPageDownload);

        // Berechne Ordner-Größe für die Infos
        const { SOUNDS_DIR } = require('../utils/constants');
        let totalSize = 0;
        if (fs.existsSync(SOUNDS_DIR)) {
            const files = fs.readdirSync(SOUNDS_DIR).filter(f => f.endsWith('.mp3'));
            totalSize = files.reduce((sum, file) => {
                const stats = fs.statSync(path.join(SOUNDS_DIR, file));
                return sum + stats.size;
            }, 0);
        }
        const estimatedArchives = Math.ceil(totalSize / (9.98 * 1024 * 1024));

        const downloadEmbed = new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle(`📥 Download | Seite ${pageIndex + 1} von ${totalPages}`)
            .setDescription('**Wähle einen Sound oder Alle Sounds**')
            .addFields(
                { name: '🎵 Verfügbare Sounds', value: `${soundButtons.length} Sounds`, inline: true },
                { name: '💾 Ordner-Größe', value: `${(totalSize / 1024 / 1024).toFixed(1)} MB`, inline: true },
                { name: '📦 Archive (bei Komplett-Download)', value: `~${estimatedArchives} Teile`, inline: true }
            );

        const rows = [];
        // Sound-Buttons (4 Reihen à 5 Buttons)
        for (let i = 0; i < pageSounds.length && rows.length < 4; i += 5) {
            const rowButtons = pageSounds.slice(i, i + 5).map(sound => 
                new ButtonBuilder()
                    .setCustomId(`download_sound_${sound.label}`)
                    .setLabel(sound.label)
                    .setStyle(ButtonStyle.Secondary)
            );
            rows.push(new ActionRowBuilder().addComponents(rowButtons));
        }

        // Navigation + "Alle Sounds" Button in der letzten Reihe
        const navigationButtons = [
            new ButtonBuilder()
                .setCustomId('download_prev_page')
                .setLabel('←')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(pageIndex === 0),
            new ButtonBuilder()
                .setCustomId('download_next_page')
                .setLabel('→')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(pageIndex >= totalPages - 1),
            new ButtonBuilder()
                .setCustomId('download_all_from_menu')
                .setLabel('📦 Alle Sounds')
                .setStyle(ButtonStyle.Success)
        ];

        const navigationRow = new ActionRowBuilder().addComponents(navigationButtons);
        rows.push(navigationRow);

        // Prüfe ob es eine Message oder Interaction ist
        if (messageOrInteraction.author) {
            // Es ist eine Message (8download command)
            await messageOrInteraction.author.send({ embeds: [downloadEmbed], components: rows });
            const confirmMsg = await messageOrInteraction.reply('📥 Ich habe dir das Download-Menü per DM gesendet!');
            setTimeout(() => confirmMsg.delete().catch(console.error), 5000);
        } else {
            // Es ist eine Interaction (Button click)
            await messageOrInteraction.update({ embeds: [downloadEmbed], components: rows });
        }
    }

    async handleSoundDownload(interaction, soundName) {
        const soundPath = path.join(require('../utils/constants').SOUNDS_DIR, `${soundName}.mp3`);

        if (!fs.existsSync(soundPath)) {
            await interaction.reply({ 
                content: '❌ Sound nicht gefunden. Möglicherweise wurde er gelöscht.', 
                flags: 64
            });
            return;
        }

        try {
            await interaction.deferReply();

            const progressEmbed = new EmbedBuilder()
                .setColor(0xFFAA00)
                .setTitle('📥 Download wird vorbereitet...')
                .setDescription(`**${soundName}.mp3** wird vorbereitet...`);

            await interaction.editReply({ embeds: [progressEmbed] });
            await new Promise(resolve => setTimeout(resolve, 1000));

            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Download bereit!')
                .setDescription(`**${soundName}.mp3** wurde gesendet!`)
                .addFields(
                    { name: '📁 Dateiname', value: `${soundName}.mp3`, inline: true },
                    { name: '💾 Herunterladen', value: 'Klicke auf die Datei', inline: true }
                );

            await interaction.editReply({ 
                embeds: [successEmbed], 
                files: [soundPath] 
            });

            // Log the download
            const berlinTime = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
            const logMessage = `${berlinTime} - ${interaction.user.tag} downloaded sound ${soundName}`;
            console.log(logMessage);
            fs.appendFileSync(SOUND_LOGS_PATH, logMessage + "\n", 'utf8');

        } catch (error) {
            console.error('Fehler beim Sound-Download:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Download fehlgeschlagen')
                .setDescription('Ein Fehler ist beim Download aufgetreten.');

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
}

module.exports = new DownloadCommands();