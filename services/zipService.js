const { EmbedBuilder } = require('discord.js');
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');
const { SOUNDS_DIR, TEMP_DIR, SOUND_LOGS_PATH, CHUNK_SIZE, COLORS } = require('../utils/constants');
const soundUtils = require('../utils/soundUtils');

class ZipService {
    async createAndSendSplitArchive(originalInteraction) {
        // Erstelle temp Ordner
        if (!fs.existsSync(TEMP_DIR)) {
            fs.mkdirSync(TEMP_DIR, { recursive: true });
        }

        try {
            // Verwende die Reply-Nachricht für alle Updates
            const updateMessage = async (embed, files = null) => {
                if (files) {
                    await originalInteraction.editReply({ embeds: [embed], files: files });
                } else {
                    await originalInteraction.editReply({ embeds: [embed] });
                }
            };

            await this.showProgressInMessage(updateMessage, 'Erstelle ZIP...', 'Schritt 1/3');
            const mainZipPath = path.join(TEMP_DIR, 'sounds.zip');
            await this.createMainZip(SOUNDS_DIR, mainZipPath);

            await this.showProgressInMessage(updateMessage, 'Teile auf...', 'Schritt 2/3');
            const splitFiles = await this.createSplitArchive(mainZipPath, TEMP_DIR);

            await this.showProgressInMessage(updateMessage, 'Upload...', 'Schritt 3/3');
            const totalSize = splitFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);

            // FINALE NACHRICHT
            await this.showFinalResultInMessage(updateMessage, splitFiles, totalSize);

            // Log the download
            const berlinTime = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
            const logMessage = `${berlinTime} - ${originalInteraction.user.tag} downloaded ALL sounds (${splitFiles.length} chunks)`;
            console.log(logMessage);
            fs.appendFileSync(SOUND_LOGS_PATH, logMessage + "\n", 'utf8');

            // Cleanup
            setTimeout(() => {
                try {
                    fs.rmSync(TEMP_DIR, { recursive: true });
                    console.log('Temp-Dateien gelöscht');
                } catch (error) {
                    console.error('Fehler beim Löschen der Temp-Dateien:', error);
                }
            }, 10000);

        } catch (error) {
            console.error('Fehler beim Erstellen des ZIP-Downloads:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle('❌ Fehler')
                .setDescription('Archiv-Erstellung fehlgeschlagen.');

            await originalInteraction.editReply({ embeds: [errorEmbed] });
        }
    }

    async createMainZip(sourceDir, outputPath) {
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(outputPath);
            const archive = archiver('zip', { 
                zlib: { level: 9 }
            });

            output.on('close', () => {
                console.log(`ZIP erstellt: ${archive.pointer()} bytes`);
                resolve();
            });

            archive.on('error', reject);
            archive.pipe(output);

            const soundFiles = fs.readdirSync(sourceDir).filter(file => file.endsWith('.mp3'));
            soundFiles.forEach(file => {
                const filePath = path.join(sourceDir, file);
                archive.file(filePath, { name: `sounds/${file}` });
            });

            archive.finalize();
        });
    }

    async createSplitArchive(zipPath, outputDir) {
        const chunkSize = CHUNK_SIZE;
        const zipBuffer = fs.readFileSync(zipPath);
        const chunks = [];
        
        let chunkIndex = 1;
        let offset = 0;

        while (offset < zipBuffer.length) {
            const chunkEnd = Math.min(offset + chunkSize, zipBuffer.length);
            const chunk = zipBuffer.slice(offset, chunkEnd);
            
            const chunkFileName = `sounds.zip.${String(chunkIndex).padStart(3, '0')}`;
            const chunkPath = path.join(outputDir, chunkFileName);
            
            fs.writeFileSync(chunkPath, chunk);
            chunks.push(chunkPath);
            
            offset = chunkEnd;
            chunkIndex++;
        }

        fs.unlinkSync(zipPath);
        return chunks;
    }

    async showProgressInMessage(updateFunction, title, step) {
        const progressEmbed = new EmbedBuilder()
            .setColor(COLORS.WARNING)
            .setTitle(`⏳ ${title}`)
            .setDescription(`**${step}**`);

        await updateFunction(progressEmbed);
    }

    async showFinalResultInMessage(updateFunction, splitFiles, totalSize) {
        const finalEmbed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle('✅ Download bereit!')
            .setDescription(`**${splitFiles.length} Teile** mit **${soundUtils.getSoundboardButtons().length} Sounds** gesendet.`)
            .addFields(
                { name: '💾 Download', value: 'Alle Teile anklicken', inline: true },
                { name: '🔧 Entpacken', value: 'Nur .001 mit 7-Zip öffnen', inline: true },
                { name: '📁 Größe', value: `${(totalSize / 1024 / 1024).toFixed(1)} MB`, inline: true }
            );

        // Sende die finale Nachricht mit allen Dateien
        await updateFunction(finalEmbed, splitFiles);
    }
}

module.exports = new ZipService();