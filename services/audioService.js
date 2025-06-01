const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { SOUNDS_DIR, SOUND_LOGS_PATH, GIF_URL } = require('../utils/constants');
const soundUtils = require('../utils/soundUtils');
const embedUtils = require('../utils/embedUtils');
const stateManager = require('../utils/stateManager');

class AudioService {
    constructor() {
        this.player = createAudioPlayer();
        this.connection = null;
        this.lastChannelId = null;
        this.lastGuildId = null;
    }

    setupAudioEvents() {
        // ========== AUDIO PLAYER EVENTS ==========
        this.player.on('error', error => {
            console.error('🔴 [AUDIO] Player Fehler:', error.message);
            this.logToFile(`[AUDIO ERROR] ${error.message}`);
            this.player.stop();
            // Erzwinge Idle-Status bei Fehler
            this.forceIdleUpdate();
        });

        this.player.on(AudioPlayerStatus.Idle, () => {
            console.log('⏹️ [AUDIO] Player Status: IDLE - Sound beendet');
            this.handleSoundFinished();
        });

        this.player.on(AudioPlayerStatus.Buffering, () => {
            console.log('🔄 [AUDIO] Player Status: BUFFERING');
        });

        this.player.on(AudioPlayerStatus.Playing, () => {
            console.log('▶️ [AUDIO] Player Status: PLAYING');
            const currentSound = stateManager.getCurrentPlayingFileName();
            console.log(`🎵 [AUDIO] Aktueller Sound: "${currentSound}"`);
            
            const state = stateManager.getSoundboardState();
            if (!state.inHelpMenu) {
                this.updateEmbedWithPlayingStatus();
            }
        });

        this.player.on(AudioPlayerStatus.AutoPaused, () => {
            console.log('⏸️ [AUDIO] Player Status: AUTO_PAUSED');
            this.logToFile('[AUDIO] Player wurde automatisch pausiert');
            // Bei Auto-Pause auch Idle-Status setzen
            setTimeout(() => this.forceIdleUpdate(), 1000);
        });

        this.player.on(AudioPlayerStatus.Paused, () => {
            console.log('⏸️ [AUDIO] Player Status: PAUSED');
        });

        // Zusätzlicher Timeout-Handler für hängende Animations
        this.player.on('stateChange', (oldState, newState) => {
            console.log(`🔄 [AUDIO] Player State Change: ${oldState.status} → ${newState.status}`);
            
            if (newState.status === AudioPlayerStatus.Idle) {
                console.log('✅ [AUDIO] State Change bestätigt: Sound ist IDLE');
                // Doppelt sicherstellen dass Idle-Update ausgeführt wird
                setTimeout(() => this.handleSoundFinished(), 500);
            }
        });
    }

    // ========== CONNECTION LOGGING ==========
    setupConnectionEvents(connection, channelName) {
        if (!connection) return;

        connection.on(VoiceConnectionStatus.Connecting, () => {
            console.log(`🔗 [CONNECTION] Verbinde zu Channel: ${channelName}...`);
            this.logToFile(`[CONNECTION] Connecting to ${channelName}`);
        });

        connection.on(VoiceConnectionStatus.Ready, () => {
            console.log(`✅ [CONNECTION] Erfolgreich verbunden mit: ${channelName}`);
            this.logToFile(`[CONNECTION] Successfully connected to ${channelName}`);
        });

        connection.on(VoiceConnectionStatus.Disconnected, () => {
            console.log(`❌ [CONNECTION] Getrennt von: ${channelName}`);
            this.logToFile(`[CONNECTION] Disconnected from ${channelName}`);
        });

        connection.on(VoiceConnectionStatus.Destroyed, () => {
            console.log(`💥 [CONNECTION] Zerstört: ${channelName}`);
            this.logToFile(`[CONNECTION] Destroyed connection to ${channelName}`);
        });

        connection.on(VoiceConnectionStatus.Signalling, () => {
            console.log(`📡 [CONNECTION] Signalling: ${channelName}`);
        });

        connection.on('error', (error) => {
            console.error(`🔴 [CONNECTION] Fehler in ${channelName}:`, error.message);
            this.logToFile(`[CONNECTION ERROR] ${channelName}: ${error.message}`);
        });

        connection.on('stateChange', (oldState, newState) => {
            console.log(`🔄 [CONNECTION] Status-Wechsel: ${oldState.status} → ${newState.status} (${channelName})`);
            this.logToFile(`[CONNECTION] State change: ${oldState.status} → ${newState.status} (${channelName})`);
        });
    }

    // ========== NEUE METHODEN FÜR BESSERES EMBED-HANDLING ==========
    handleSoundFinished() {
        console.log('🏁 [EMBED] Sound beendet - räume auf...');
        
        const currentSound = stateManager.getCurrentPlayingFileName();
        console.log(`🏁 [EMBED] Beendeter Sound: "${currentSound}"`);
        
        // State zurücksetzen
        stateManager.setCurrentPlayingFileName('');
        
        const state = stateManager.getSoundboardState();
        console.log(`🏁 [EMBED] Aktueller State: inHelpMenu=${state.inHelpMenu}, inSoundboardMenu=${state.inSoundboardMenu}, inTop20Menu=${state.inTop20Menu}`);
        
        if (!state.inHelpMenu) {
            this.updateEmbedWithIdleStatus();
        }
        
        // Backup-Timer für hängende Embeds
        setTimeout(() => {
            this.forceIdleUpdate();
        }, 2000);
    }

    forceIdleUpdate() {
        console.log('🚨 [EMBED] Force Idle Update - erzwinge Status-Reset');
        
        const currentInteraction = stateManager.getCurrentInteraction();
        if (!currentInteraction) {
            console.log('⚠️ [EMBED] Keine aktuelle Interaction für Force Update');
            return;
        }
        
        const state = stateManager.getSoundboardState();
        let updatedEmbed;
        
        if (state.inSoundboardMenu) {
            const totalPages = soundUtils.getTotalPages();
            updatedEmbed = embedUtils.createStatusEmbed(`A - Z | Seite ${state.currentPageIndex + 1} von ${totalPages}`);
            console.log(`🚨 [EMBED] Force Update für Soundboard-Menü (Seite ${state.currentPageIndex + 1})`);
        } else if (state.inTop20Menu) {
            updatedEmbed = embedUtils.createStatusEmbed("Menü | Top 10");
            console.log('🚨 [EMBED] Force Update für Top 10 Menü');
        } else {
            console.log('🚨 [EMBED] Unbekannter Menu-State für Force Update');
            return;
        }
        
        if (updatedEmbed && (currentInteraction.replied || currentInteraction.deferred)) {
            currentInteraction.editReply({ embeds: [updatedEmbed] })
                .then(() => {
                    console.log('✅ [EMBED] Force Update erfolgreich');
                })
                .catch(error => {
                    console.log('❌ [EMBED] Force Update fehlgeschlagen:', error.message);
                    stateManager.setCurrentInteraction(null);
                });
        }
    }

    // ========== MAIN PLAY METHODS ==========
    async playSound(context, soundName, sendReply = false, fromSoundboard = false) {
        const soundFilePath = path.join(SOUNDS_DIR, `${soundName}.mp3`);
        
        if (!fs.existsSync(soundFilePath)) {
            console.log(`❌ [SOUND] Sound nicht gefunden: ${soundName}`);
            const errorMessage = await context.reply("Sound oder Befehl gibt es nicht.");
            setTimeout(() => {
                errorMessage.delete().catch(console.error);
            }, 3000);
            return;
        }

        const isMessage = context.constructor.name === 'Message';
        stateManager.setCurrentPlayingFileName(soundName);
        stateManager.setCurrentlyPlayingSound(soundName);

        // Erweiterte Logging
        const berlinTime = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
        const username = isMessage ? context.author.tag : context.user.tag;
        const serverName = context.guild.name;
        const channelName = context.member.voice.channel?.name || 'Unbekannt';
        const voiceChannelId = context.member.voice.channelId;
        
        console.log(`🎵 [SOUND] ${username} möchte "${soundName}" in Channel "${channelName}" (${voiceChannelId}) abspielen`);
        
        const logMessage = `${berlinTime} - ${username} played ${soundName} in channel ${channelName} on server ${serverName}`;
        console.log(logMessage);
        fs.appendFileSync(SOUND_LOGS_PATH, logMessage + "\n", 'utf8');

        // Set current interaction
        if (!isMessage) {
            stateManager.setCurrentInteraction(context);
        }

        // Voice channel validation
        if (!voiceChannelId) {
            console.log(`❌ [VOICE] ${username} ist in keinem Voice Channel`);
            const replyText = 'Du musst in einem Sprachkanal sein, um den Sound abzuspielen.';
            const errorMessage = await context.reply(replyText);
            setTimeout(() => {
                errorMessage.delete().catch(console.error);
            }, 3000);
            return;
        }

        // Join voice channel
        const channel = context.guild.channels.cache.get(voiceChannelId);
        try {
            await this.ensureVoiceConnection(channel, username);
        } catch (error) {
            console.error(`❌ [CONNECTION] Connection zu "${channel.name}" fehlgeschlagen:`, error.message);
            const errorMsg = await context.reply('❌ Verbindung zum Voice Channel fehlgeschlagen. Versuche es erneut.');
            setTimeout(() => errorMsg.delete().catch(console.error), 5000);
            return;
        }

        // Stop current sound and play new one
        if (this.player.state.status === AudioPlayerStatus.Playing) {
            console.log('⏹️ [AUDIO] Stoppe aktuellen Sound für neuen Sound');
            this.player.stop();
        }

        console.log(`🚀 [AUDIO] Starte Wiedergabe: ${soundName}`);
        const resource = createAudioResource(soundFilePath);
        this.player.play(resource);
        this.connection.subscribe(this.player);

        // Send reply if requested
        if (sendReply) {
            const state = stateManager.getSoundboardState();
            const embedTitle = fromSoundboard 
                ? `A - Z | Seite ${state.currentPageIndex + 1} von ${soundUtils.getTotalPages()}`
                : "Menü | Top 10";
            
            const updatedEmbed = new EmbedBuilder()
                .setColor(0x00AE86)
                .setTitle(embedTitle)
                .setDescription(`🔊 ${soundName} wird abgespielt...`)
                .setThumbnail(GIF_URL);

            if (isMessage) {
                await context.reply({ embeds: [updatedEmbed] });
            } else {
                await context.update({ embeds: [updatedEmbed] });
            }
        }
        
        soundUtils.updateSoundCount(soundFilePath);
    }

    async playSoundWithoutCounting(interaction, soundName) {
        const soundFilePath = path.join(SOUNDS_DIR, `${soundName}.mp3`);
        
        stateManager.setCurrentInteraction(interaction);
        stateManager.setCurrentPlayingFileName(soundName);
        stateManager.setCurrentlyPlayingSound(soundName);

        console.log(`🎵 [SOUND] ${interaction.user.tag} möchte "${soundName}" abspielen (ohne Zählung)`);

        if (!interaction.member.voice.channelId) {
            console.log(`❌ [VOICE] ${interaction.user.tag} ist in keinem Voice Channel`);
            const errorMessage = await interaction.reply('Du musst in einem Sprachkanal sein, um den Sound abzuspielen.');
            setTimeout(() => {
                errorMessage.delete().catch(console.error);
            }, 3000);
            return;
        }

        await interaction.deferUpdate();

        const channel = interaction.guild.channels.cache.get(interaction.member.voice.channelId);
        try {
            await this.ensureVoiceConnection(channel, interaction.user.tag);
        } catch (error) {
            console.error(`❌ [CONNECTION] Connection zu "${channel.name}" fehlgeschlagen:`, error.message);
            await interaction.editReply({ content: '❌ Verbindung zum Voice Channel fehlgeschlagen. Versuche es erneut.' });
            return;
        }

        if (this.player.state.status === AudioPlayerStatus.Playing) {
            console.log('⏹️ [AUDIO] Stoppe aktuellen Sound für neuen Sound (ohne Zählung)');
            this.player.stop();
        }

        try {
            console.log(`🚀 [AUDIO] Starte Wiedergabe: ${soundName} (ohne Zählung)`);
            const resource = createAudioResource(soundFilePath);
            this.player.play(resource);
            this.connection.subscribe(this.player);

            // Logging
            const berlinTime = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
            const logMessage = `${berlinTime} - ${interaction.user.tag} played ${soundName} in channel ${channel.name} on server ${interaction.guild.name}`;
            console.log(logMessage);
            fs.appendFileSync(SOUND_LOGS_PATH, logMessage + "\n", 'utf8');
        } catch (error) {
            console.error("🔴 [AUDIO] Fehler beim Abspielen des Sounds:", error);
            this.logToFile(`[AUDIO ERROR] Failed to play ${soundName}: ${error.message}`);
        }
    }

    // ========== CONNECTION MANAGEMENT ==========
    async ensureVoiceConnection(channel, username) {
        const channelId = channel.id;
        const guildId = channel.guild.id;
        const channelName = channel.name;

        // Prüfe ob neue Connection benötigt wird
        const needsNewConnection = !this.connection || 
            this.connection.joinConfig.channelId !== channelId ||
            this.connection.state.status === 'destroyed' ||
            this.connection.state.status === 'disconnected' ||
            this.connection.state.status === 'signalling' ||
            this.connection.state.status === 'connecting' ||  // AUCH CONNECTING!
            this.lastChannelId !== channelId ||
            this.lastGuildId !== guildId;

        if (needsNewConnection) {
            const oldChannelInfo = this.lastChannelId ? `von Channel ${this.lastChannelId}` : 'keine vorherige Connection';
            console.log(`🔄 [CONNECTION] ${username} benötigt neue Connection: ${oldChannelInfo} → ${channelName} (${channelId})`);
            
            // Alte Connection explizit beenden
            if (this.connection) {
                try {
                    console.log(`💥 [CONNECTION] Zerstöre alte Connection...`);
                    this.connection.destroy();
                    this.logToFile(`[CONNECTION] Destroyed old connection`);
                } catch (error) {
                    console.log('⚠️ [CONNECTION] Alte Connection konnte nicht beendet werden:', error.message);
                }
                this.connection = null;
            }
            
            console.log(`✨ [CONNECTION] Erstelle neue Voice Connection für "${channelName}" (${channelId})`);
            this.logToFile(`[CONNECTION] Creating new connection to ${channelName} (${channelId}) for user ${username}`);
            
            // Neue Connection erstellen
            this.connection = joinVoiceChannel({
                channelId: channelId,
                guildId: guildId,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });

            // Event-Listener für neue Connection
            this.setupConnectionEvents(this.connection, channelName);
            
            // Speichere aktuelle Channel-Info
            this.lastChannelId = channelId;
            this.lastGuildId = guildId;
        }

        // KRITISCH: Warte auf READY-Status!
        await this.waitForConnectionReady(channelName);
        console.log(`✅ [CONNECTION] Connection Setup abgeschlossen für ${channelName} - STATUS: ${this.connection.state.status}`);
    }

    async waitForConnectionReady(channelName) {
        if (!this.connection) {
            throw new Error('Keine Connection vorhanden');
        }

        console.log(`⏳ [CONNECTION] Warte auf READY-Status für "${channelName}"...`);
        console.log(`🔍 [CONNECTION] Aktueller Status: ${this.connection.state.status}`);

        // Wenn bereits ready, sofort weiter
        if (this.connection.state.status === VoiceConnectionStatus.Ready) {
            console.log(`✅ [CONNECTION] Bereits READY für "${channelName}"`);
            return;
        }

        // Warte auf Ready-Event mit Timeout
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                console.log(`❌ [CONNECTION] TIMEOUT beim Warten auf READY für "${channelName}"`);
                // Versuche trotzdem weiterzumachen
                resolve();
            }, 5000); // 5 Sekunden Timeout

            const onReady = () => {
                console.log(`✅ [CONNECTION] READY erhalten für "${channelName}"`);
                clearTimeout(timeout);
                this.connection.off(VoiceConnectionStatus.Ready, onReady);
                this.connection.off(VoiceConnectionStatus.Disconnected, onError);
                this.connection.off(VoiceConnectionStatus.Destroyed, onError);
                resolve();
            };

            const onError = () => {
                console.log(`❌ [CONNECTION] Connection failed für "${channelName}"`);
                clearTimeout(timeout);
                this.connection.off(VoiceConnectionStatus.Ready, onReady);
                this.connection.off(VoiceConnectionStatus.Disconnected, onError);
                this.connection.off(VoiceConnectionStatus.Destroyed, onError);
                reject(new Error('Connection failed'));
            };

            // Event-Listener
            this.connection.on(VoiceConnectionStatus.Ready, onReady);
            this.connection.on(VoiceConnectionStatus.Disconnected, onError);
            this.connection.on(VoiceConnectionStatus.Destroyed, onError);

            // Für den Fall dass die Connection zwischen der Prüfung und hier ready wird
            if (this.connection.state.status === VoiceConnectionStatus.Ready) {
                onReady();
            }
        });
    }

    // ========== OTHER METHODS ==========
    async playRandomSound(interaction) {
        console.log(`🎲 [RANDOM] ${interaction.user.tag} möchte zufälligen Sound`);
        const soundFiles = soundUtils.getSoundboardButtons();
        if (soundFiles.length === 0) {
            console.log('❌ [RANDOM] Keine Sounds verfügbar');
            await interaction.reply({ content: 'Keine Sounds verfügbar.', flags: 64 });
            return;
        }
        
        const randomIndex = Math.floor(Math.random() * soundFiles.length);
        const randomSound = soundFiles[randomIndex];
        console.log(`🎲 [RANDOM] Gewählter Sound: ${randomSound.label}`);
        await this.playSound(interaction, randomSound.label, true, false);
    }

    async stopSound() {
        console.log('⏹️ [STOP] Stop-Befehl erhalten');
        if (this.player.state.status === AudioPlayerStatus.Playing) {
            console.log('⏹️ [STOP] Stoppe aktuelle Wiedergabe');
            this.player.stop();
            this.logToFile('[STOP] Sound stopped by user command');
        } else {
            console.log('ℹ️ [STOP] Kein Sound läuft aktuell');
        }
    }

    async disconnect() {
        console.log('🔌 [DISCONNECT] Disconnect-Befehl erhalten');
        if (this.connection) {
            const channelInfo = this.lastChannelId ? `von Channel ${this.lastChannelId}` : '';
            console.log(`🔌 [DISCONNECT] Trenne Connection ${channelInfo}`);
            this.connection.destroy();
            this.connection = null;
            this.lastChannelId = null;
            this.lastGuildId = null;
            stateManager.setCurrentlyPlayingSound('');
            this.logToFile('[DISCONNECT] Manual disconnect executed');
        } else {
            console.log('ℹ️ [DISCONNECT] Keine aktive Connection zum Trennen');
        }
    }

    // ========== HELPER METHODS ==========
    logToFile(message) {
        const berlinTime = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
        const logEntry = `${berlinTime} - ${message}`;
        fs.appendFileSync(SOUND_LOGS_PATH, logEntry + "\n", 'utf8');
    }

    // ========== VERBESSERTE UPDATE-METHODEN ==========
    updateEmbedWithPlayingStatus() {
        const currentInteraction = stateManager.getCurrentInteraction();
        const currentPlayingFileName = stateManager.getCurrentPlayingFileName();
        
        console.log(`🎵 [EMBED] Update Playing Status für: "${currentPlayingFileName}"`);
        
        if (!currentInteraction) {
            console.log('⚠️ [EMBED] Keine aktuelle Interaction für Playing Update');
            return;
        }
        
        if (!currentPlayingFileName) {
            console.log('⚠️ [EMBED] Kein aktueller Dateiname für Playing Update');
            return;
        }

        let updatedEmbed;
        const state = stateManager.getSoundboardState();

        if (state.inSoundboardMenu) {
            const totalPages = soundUtils.getTotalPages();
            updatedEmbed = new EmbedBuilder()
                .setColor(0x00AE86)
                .setTitle(`A - Z | Seite ${state.currentPageIndex + 1} von ${totalPages}`)
                .setDescription(`🔊 ${currentPlayingFileName} wird abgespielt...`)
                .setThumbnail(GIF_URL);
            console.log(`🎵 [EMBED] Playing Update für Soundboard (Sound: ${currentPlayingFileName})`);
        } else if (state.inTop20Menu) {
            updatedEmbed = new EmbedBuilder()
                .setColor(0x00AE86)
                .setTitle("Menü | Top 10")
                .setDescription(`🔊 ${currentPlayingFileName} wird abgespielt...`)
                .setThumbnail(GIF_URL);
            console.log(`🎵 [EMBED] Playing Update für Top 10 (Sound: ${currentPlayingFileName})`);
        } else {
            console.log('⚠️ [EMBED] Unbekannter Menu-State für Playing Update');
            return;
        }

        if (updatedEmbed && (currentInteraction.replied || currentInteraction.deferred)) {
            currentInteraction.editReply({ embeds: [updatedEmbed] })
                .then(() => {
                    console.log('✅ [EMBED] Playing Status Update erfolgreich');
                })
                .catch(error => {
                    console.log('❌ [EMBED] Playing Update fehlgeschlagen:', error.message);
                    stateManager.setCurrentInteraction(null);
                });
        }
    }

    updateEmbedWithIdleStatus() {
        const currentInteraction = stateManager.getCurrentInteraction();
        
        console.log('💤 [EMBED] Update Idle Status');
        
        if (!currentInteraction) {
            console.log('⚠️ [EMBED] Keine aktuelle Interaction für Idle Update');
            return;
        }

        let updatedEmbed;
        const state = stateManager.getSoundboardState();

        if (state.inSoundboardMenu) {
            const totalPages = soundUtils.getTotalPages();
            updatedEmbed = embedUtils.createStatusEmbed(`A - Z | Seite ${state.currentPageIndex + 1} von ${totalPages}`);
            console.log(`💤 [EMBED] Idle Update für Soundboard (Seite ${state.currentPageIndex + 1})`);
        } else if (state.inTop20Menu) {
            updatedEmbed = embedUtils.createStatusEmbed("Menü | Top 10");
            console.log('💤 [EMBED] Idle Update für Top 10');
        } else {
            console.log('⚠️ [EMBED] Unbekannter Menu-State für Idle Update');
            return;
        }

        if (updatedEmbed && (currentInteraction.replied || currentInteraction.deferred)) {
            currentInteraction.editReply({ embeds: [updatedEmbed] })
                .then(() => {
                    console.log('✅ [EMBED] Idle Status Update erfolgreich - Animation gestoppt');
                })
                .catch(error => {
                    console.log('❌ [EMBED] Idle Update fehlgeschlagen:', error.message);
                    stateManager.setCurrentInteraction(null);
                    
                    // Letzter Versuch mit Force Update
                    setTimeout(() => this.forceIdleUpdate(), 1000);
                });
        } else {
            console.log('⚠️ [EMBED] Idle Update nicht möglich - fehlende Bedingungen');
        }
    }
}

module.exports = new AudioService();