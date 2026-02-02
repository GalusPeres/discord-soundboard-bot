const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { SOUNDS_DIR, MAX_FILE_SIZE, MAX_FILENAME_LENGTH, SOUND_LOGS_PATH } = require('../utils/constants');
const stateManager = require('../utils/stateManager');

class UploadCommands {
    async handleUpload(message) {
        try {
            const uploadEmbed = new EmbedBuilder()
                .setColor(0x00AE86)
                .setTitle('🎵 Sound Upload')
                .setDescription('**Willkommen beim Sound-Upload!**\n\nSo funktioniert es:\n• Klicke auf "Upload starten"\n• Lade dann deine MP3-Datei mit dem + Button hoch\n• Nach dem Upload erscheint automatisch der Transfer-Button')
                .addFields(
                    { name: '📋 Format', value: 'Nur MP3', inline: true },
                    { name: '📏 Max. Größe', value: '10MB', inline: true },
                    { name: '🏷️ Sound-Name', value: 'Max. 10 Zeichen (ohne .mp3)', inline: true }
                );

            const uploadButton = new ButtonBuilder()
                .setCustomId('upload_confirm')
                .setLabel('📁 Upload starten')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(uploadButton);

            await message.author.send({ embeds: [uploadEmbed], components: [row] });
            
            const confirmMsg = await message.channel.send({ content: '📩 Ich habe dir eine private Nachricht gesendet!', allowedMentions: { parse: [] } });
            setTimeout(() => confirmMsg.delete().catch(console.error), 5000);
            
        } catch (error) {
            console.error('Fehler beim Senden der Upload-DM:', error);
            const errorMsg = await message.channel.send({ content: '❌ Konnte dir keine private Nachricht senden. Stelle sicher, dass DMs von Server-Mitgliedern erlaubt sind.', allowedMentions: { parse: [] } });
            setTimeout(() => errorMsg.delete().catch(console.error), 8000);
        }
    }

    async handleFileUpload(message) {
        const activeUploaders = stateManager.getActiveUploaders();
        if (!activeUploaders.has(message.author.id)) return;

        console.log('Datei hochgeladen von:', message.author.tag);
        
        const attachment = message.attachments.first();
        if (!attachment) return;

        // File validation
        const fileExtension = path.extname(attachment.name).toLowerCase();

        if (attachment.size > MAX_FILE_SIZE) {
            await message.channel.send({ content: '❌ Datei ist zu groß! Maximum: 10MB', allowedMentions: { parse: [] } });
            activeUploaders.delete(message.author.id);
            return;
        }

        if (fileExtension !== '.mp3') {
            await message.channel.send({ content: '❌ Nur MP3-Dateien erlaubt!', allowedMentions: { parse: [] } });
            activeUploaders.delete(message.author.id);
            return;
        }

        // Generate filename
        let fileName = path.basename(attachment.name, fileExtension);
        fileName = fileName.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        if (fileName.length === 0) {
            fileName = 'sound' + Date.now();
        }

        if (fileName.length > MAX_FILENAME_LENGTH) {
            await message.channel.send({ content: `❌ Dateiname zu lang! Maximum: ${MAX_FILENAME_LENGTH} Zeichen\n\n**"${fileName}"** hat ${fileName.length} Zeichen.\n\nBitte benenne die Datei um oder wähle einen kürzeren Namen.`, allowedMentions: { parse: [] } });
            activeUploaders.delete(message.author.id);
            return;
        }

        const outputPath = path.join(SOUNDS_DIR, `${fileName}.mp3`);

        // Store upload info
        const pendingUploads = stateManager.getPendingUploads();
        pendingUploads.set(message.author.id, {
            attachment: attachment,
            fileName: fileName,
            outputPath: outputPath
        });

        activeUploaders.delete(message.author.id);

        // Check if file exists
        if (fs.existsSync(outputPath)) {
            await this.showOverwriteConfirmation(message, fileName);
        } else {
            await this.showTransferButton(message, fileName, attachment);
        }
    }

    async showOverwriteConfirmation(message, fileName) {
        const overwriteEmbed = new EmbedBuilder()
            .setColor(0xFFAA00)
            .setTitle('⚠️ Sound existiert bereits!')
            .setDescription(`**${fileName}.mp3** ist bereits vorhanden`)
            .addFields(
                { name: '🎵 Existierender Sound', value: fileName, inline: true },
                { name: '📁 Verwendung', value: `\`8${fileName}\``, inline: true },
                { name: '🔄 Überschreiben?', value: 'Alte Version wird ersetzt', inline: true }
            )
            .setFooter({ text: 'Möchtest du den existierenden Sound überschreiben?' });

        const overwriteButton = new ButtonBuilder()
            .setCustomId('overwrite_confirm')
            .setLabel('🔄 Überschreiben')
            .setStyle(ButtonStyle.Danger);

        const cancelButton = new ButtonBuilder()
            .setCustomId('upload_cancel')
            .setLabel('❌ Abbrechen')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(overwriteButton, cancelButton);
        await message.channel.send({ embeds: [overwriteEmbed], components: [row], allowedMentions: { parse: [] } });
    }

    async showTransferButton(message, fileName, attachment) {
        const readyEmbed = new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle('✅ Datei bereit zum Übertragen!')
            .setDescription(`**${fileName}.mp3** ist bereit zum Download`)
            .addFields(
                { name: '🎵 Sound-Name', value: fileName, inline: true },
                { name: '📁 Verwendung', value: `\`8${fileName}\``, inline: true },
                { name: '📊 Dateigröße', value: `${(attachment.size / 1024 / 1024).toFixed(2)} MB`, inline: true }
            )
            .setFooter({ text: 'Klicke auf den Button um den Transfer zu starten!' });

        const transferButton = new ButtonBuilder()
            .setCustomId('transfer_file')
            .setLabel('🚀 Zum Bot übertragen')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(transferButton);
        await message.channel.send({ embeds: [readyEmbed], components: [row], allowedMentions: { parse: [] } });
    }

    async handleButtonInteraction(interaction) {
        const customId = interaction.customId;

        if (customId === 'upload_confirm') {
            await this.handleUploadConfirm(interaction);
        } else if (customId === 'transfer_file') {
            await this.handleFileTransfer(interaction);
        } else if (customId === 'overwrite_confirm') {
            await this.handleFileTransfer(interaction, true);
        } else if (customId === 'upload_cancel') {
            await this.handleUploadCancel(interaction);
        }
    }

    async handleUploadConfirm(interaction) {
        const activeUploaders = stateManager.getActiveUploaders();
        activeUploaders.add(interaction.user.id);
        
        const waitingEmbed = new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle('📁 Jetzt MP3 hochladen!')
            .setDescription('**So geht\'s:**\n• Klicke unten auf das **+** Symbol\n• Wähle "Datei hochladen"\n• Wähle deine MP3-Datei aus (max. 10MB)\n• Sende die Datei hier in diesem Chat')
            .addFields(
                { name: '📋 Format', value: 'Nur MP3', inline: true },
                { name: '📏 Max. Größe', value: '10MB', inline: true },
                { name: '🏷️ Sound-Name', value: 'Max. 10 Zeichen (ohne .mp3)', inline: true }
            )
            .setFooter({ text: '⏳ Sobald du die MP3 hochlädst, erscheint automatisch der Transfer-Button!' });

        await interaction.update({ embeds: [waitingEmbed], components: [] });
    }

    async handleUploadCancel(interaction) {
        const userId = interaction.user.id;
        const pendingUploads = stateManager.getPendingUploads();
        const activeUploaders = stateManager.getActiveUploaders();
        
        pendingUploads.delete(userId);
        activeUploaders.delete(userId);

        await interaction.update({ 
            content: '❌ **Upload abgebrochen**\n\nDu kannst jederzeit eine neue MP3-Datei hochladen oder einen anderen Dateinamen verwenden.',
            embeds: [],
            components: [] 
        });
    }

    async handleFileTransfer(interaction, overwrite = false) {
        const userId = interaction.user.id;
        const pendingUploads = stateManager.getPendingUploads();
        const uploadInfo = pendingUploads.get(userId);

        if (!uploadInfo) {
            await interaction.reply({ content: '❌ Keine Datei zum Übertragen gefunden. Lade zuerst eine MP3-Datei hoch.', flags: 64 });
            return;
        }

        if (!overwrite && fs.existsSync(uploadInfo.outputPath)) {
            await interaction.reply({ content: '❌ Sound existiert bereits. Verwende den Überschreiben-Button.', flags: 64 });
            return;
        }

        // WICHTIG: Buttons sofort entfernen
        await interaction.update({ 
            embeds: interaction.message.embeds, 
            components: [] 
        });

        try {
            await this.showTransferProgress(interaction, uploadInfo, overwrite);
            await this.downloadFile(uploadInfo);
            await this.showTransferSuccess(interaction, uploadInfo, overwrite);
            
            // Log the upload
            const berlinTime = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
            const actionLog = overwrite ? 'overwrote' : 'uploaded';
            const logMessage = `${berlinTime} - ${interaction.user.tag} ${actionLog} sound ${uploadInfo.fileName}`;
            console.log(logMessage);
            fs.appendFileSync(SOUND_LOGS_PATH, logMessage + "\n", 'utf8');

            // Clean up
            pendingUploads.delete(userId);
            
        } catch (error) {
            await this.showTransferError(interaction, error);
            pendingUploads.delete(userId);
        }
    }

    async showTransferProgress(interaction, uploadInfo, overwrite) {
        const actionText = overwrite ? 'überschrieben' : 'übertragen';
        const progressSteps = [
            { percent: 20, text: 'Download gestartet...' },
            { percent: 50, text: 'Datei wird verarbeitet...' },
            { percent: 80, text: overwrite ? 'Überschreibe existierenden Sound...' : 'Speichere im Soundboard...' },
            { percent: 100, text: overwrite ? 'Überschreibung abgeschlossen!' : 'Transfer abgeschlossen!' }
        ];

        for (let i = 0; i < progressSteps.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 800));
            
            const step = progressSteps[i];
            const filled = Math.floor(step.percent / 10);
            const empty = 10 - filled;
            
            const updatedEmbed = new EmbedBuilder()
                .setColor(step.percent === 100 ? 0x00FF00 : 0xFFAA00)
                .setTitle(step.percent === 100 ? (overwrite ? '✅ Überschreibung erfolgreich!' : '✅ Transfer erfolgreich!') : '⏳ Transfer läuft...')
                .setDescription(`**${uploadInfo.fileName}.mp3** wird ${actionText}...\n\n${'█'.repeat(filled)}${'░'.repeat(empty)} ${step.percent}%\n${step.text}`)
                .setFooter({ text: step.percent === 100 ? 'Sound ist jetzt verfügbar!' : 'Bitte warten...' });

            // WICHTIG: Keine Buttons mehr anzeigen
            await interaction.editReply({ embeds: [updatedEmbed], components: [] });
        }
    }

    async downloadFile(uploadInfo) {
        console.log('Starte echten Download von:', uploadInfo.attachment.url);

        try {
            const response = await fetch(uploadInfo.attachment.url);
            if (!response.ok) {
                throw new Error(`Download failed: ${response.statusText}`);
            }
            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(uploadInfo.outputPath, buffer);
        } catch (error) {
            // Fallback für ältere Node.js Versionen
            const https = require('https');
            
            await new Promise((resolve, reject) => {
                const file = fs.createWriteStream(uploadInfo.outputPath);
                const request = https.get(uploadInfo.attachment.url, (response) => {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        resolve();
                    });
                });
                
                request.on('error', (err) => {
                    fs.unlink(uploadInfo.outputPath, () => {}); 
                    reject(err);
                });
                
                file.on('error', (err) => {
                    fs.unlink(uploadInfo.outputPath, () => {}); 
                    reject(err);
                });
            });
        }

        console.log('Download erfolgreich abgeschlossen');
    }

    async showTransferSuccess(interaction, uploadInfo, overwrite) {
        const successTitle = overwrite ? '🔄 Sound überschrieben!' : '🎉 Upload komplett!';
        const successDesc = overwrite ? 
            `**${uploadInfo.fileName}** wurde erfolgreich überschrieben!` : 
            `**${uploadInfo.fileName}** wurde erfolgreich hinzugefügt!`;

        const successEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(successTitle)
            .setDescription(successDesc)
            .addFields(
                { name: '🎵 Sound-Name', value: uploadInfo.fileName, inline: true },
                { name: '📁 Verwendung', value: `\`8${uploadInfo.fileName}\``, inline: true },
                { name: '📊 Dateigröße', value: `${(uploadInfo.attachment.size / 1024 / 1024).toFixed(2)} MB`, inline: true }
            )
            .setFooter({ text: 'Der Sound ist sofort im Soundboard verfügbar!' });

        // WICHTIG: Keine Buttons mehr anzeigen
        await interaction.editReply({ embeds: [successEmbed], components: [] });
    }

    async showTransferError(interaction, error) {
        console.error('Fehler beim Transfer:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Transfer fehlgeschlagen')
            .setDescription('Ein Fehler ist aufgetreten. Versuche es erneut.')
            .setFooter({ text: 'Du kannst die Datei nochmal hochladen.' });

        // WICHTIG: Keine Buttons mehr anzeigen
        await interaction.editReply({ embeds: [errorEmbed], components: [] });
    }
}

module.exports = new UploadCommands();
