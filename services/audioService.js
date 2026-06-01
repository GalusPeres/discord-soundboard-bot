const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, StreamType, NoSubscriberBehavior } = require('@discordjs/voice');
const path = require('path');
const fs = require('fs');
const { SOUNDS_DIR, SOUND_LOGS_PATH, AUTO_LEAVE_DELAY_MS } = require('../utils/constants');
const soundUtils = require('../utils/soundUtils');
const stateManager = require('../utils/stateManager');

class AudioService {
    constructor() {
        this.player = null;
        this.connection = null;
        this.lastChannelId = null;
        this.lastGuildId = null;
        this.leaveTimeout = null;
        this.leaveDelay = AUTO_LEAVE_DELAY_MS;
    }

    // Erstellt einen frischen Player für jeden Sound
    createFreshPlayer() {
        // Alten Player aufräumen
        if (this.player) {
            try {
                this.player.stop(true);
                this.player.removeAllListeners();
            } catch (e) {
                // Ignorieren
            }
        }

        this.player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play,
                maxMissedFrames: 50
            }
        });

        // Minimale Event-Handler
        this.player.on('error', error => {
            console.error('🔴 [AUDIO] Fehler:', error.message);
        });

        this.player.on(AudioPlayerStatus.Idle, () => {
            stateManager.setCurrentPlayingFileName('');
        });

        return this.player;
    }

    setupAudioEvents() {
        // Nicht mehr benötigt - Player wird pro Sound erstellt
    }

    // ========== CONNECTION EVENTS (minimal für Performance) ==========
    setupConnectionEvents(connection) {
        if (!connection) return;

        // Nur Fehler loggen - alles andere ist Performance-Overhead
        connection.on('error', (error) => {
            console.error(`🔴 [CONNECTION] Fehler:`, error.message);
        });
    }


    // ========== MAIN PLAY METHODS =========
    async playSound(context, soundName, sendReply = false, fromSoundboard = false) {
        const soundFilePath = path.join(SOUNDS_DIR, `${soundName}.mp3`);
        
        if (!fs.existsSync(soundFilePath)) {
            console.log(`❌ [SOUND] Sound nicht gefunden: ${soundName}`);
            await this.sendTempNotice(context, "Sound oder Befehl gibt es nicht.", 3000);
            return;
        }

        const isMessage = context.constructor.name === 'Message';
        stateManager.setCurrentPlayingFileName(soundName);
        stateManager.setCurrentlyPlayingSound(soundName);

        // Stelle sicher dass der Menu-State gesetzt ist (für alte Embeds nach Bot-Neustart)
        if (!isMessage) {
            const state = stateManager.getSoundboardState();
            if (!state.inTop20Menu && !state.inSoundboardMenu) {
                if (fromSoundboard) {
                    stateManager.updateSoundboardState({ inTop20Menu: false, inSoundboardMenu: true, inHelpMenu: false });
                    console.log('🔧 [STATE] Menu-State auf Soundboard gesetzt (war unbekannt)');
                } else {
                    stateManager.updateSoundboardState({ inTop20Menu: true, inSoundboardMenu: false, inHelpMenu: false });
                    console.log('🔧 [STATE] Menu-State auf Top 10 gesetzt (war unbekannt)');
                }
            }
        }

        const voiceChannelId = context.member.voice.channelId;

        // Set current interaction
        if (!isMessage) {
            stateManager.setCurrentInteraction(context);
        }

        // Voice channel validation
        if (!voiceChannelId) {
            await this.sendTempNotice(context, 'Du musst in einem Sprachkanal sein.', 3000);
            return;
        }

        // Join voice channel
        const channel = context.guild.channels.cache.get(voiceChannelId);
        try {
            await this.ensureVoiceConnection(channel);
        } catch (error) {
            await this.sendTempNotice(context, '❌ Verbindung fehlgeschlagen.', 5000);
            return;
        }

        const who = context.user?.globalName || context.user?.username || context.author?.globalName || context.author?.username || 'unknown';
        console.log(`[PLAY] ${who} → Sound "${soundName}" in "${channel?.name || voiceChannelId}"`);

        // Frischen Player erstellen und Sound abspielen
        const player = this.createFreshPlayer();
        const resource = createAudioResource(soundFilePath, {
            inputType: StreamType.Arbitrary,
            inlineVolume: false
        });
        player.play(resource);
        this.connection.subscribe(player);

        soundUtils.updateSoundCount(soundFilePath);
    }

    async playSoundWithoutCounting(interaction, soundName) {
        const soundFilePath = path.join(SOUNDS_DIR, `${soundName}.mp3`);

        stateManager.setCurrentInteraction(interaction);
        stateManager.setCurrentPlayingFileName(soundName);
        stateManager.setCurrentlyPlayingSound(soundName);

        // Stelle sicher dass der Menu-State gesetzt ist (für alte Embeds nach Bot-Neustart)
        const state = stateManager.getSoundboardState();
        if (!state.inTop20Menu && !state.inSoundboardMenu) {
            stateManager.updateSoundboardState({ inTop20Menu: true, inSoundboardMenu: false, inHelpMenu: false });
        }

        if (!interaction.member.voice.channelId) {
            const errorMessage = await interaction.reply('Du musst in einem Sprachkanal sein.');
            setTimeout(() => errorMessage.delete().catch(() => {}), 3000);
            return;
        }

        if (!interaction.deferred && !interaction.replied && typeof interaction.deferUpdate === 'function') {
            interaction.deferUpdate().catch(() => {});
        }

        const channel = interaction.guild.channels.cache.get(interaction.member.voice.channelId);
        try {
            await this.ensureVoiceConnection(channel);
        } catch (error) {
            return;
        }

        const who = interaction.user?.globalName || interaction.user?.username || 'unknown';
        const channelName = interaction.guild?.channels.cache.get(interaction.member.voice.channelId)?.name || interaction.member.voice.channelId;
        console.log(`[PLAY] ${who} → Sound "${soundName}" in "${channelName}"`);

        // Frischen Player erstellen und Sound abspielen
        try {
            const player = this.createFreshPlayer();
            const resource = createAudioResource(soundFilePath, {
                inputType: StreamType.Arbitrary,
                inlineVolume: false
            });
            player.play(resource);
            this.connection.subscribe(player);
        } catch (error) {
            console.error("🔴 [AUDIO] Fehler:", error.message);
        }
    }

    // ========== CONNECTION MANAGEMENT ==========
    async ensureVoiceConnection(channel) {
        const channelId = channel.id;
        const guildId = channel.guild.id;

        this.clearLeaveTimeout();

        // FAST PATH: Connection existiert und ready → sofort weiter!
        if (this.connection &&
            this.connection.state.status === VoiceConnectionStatus.Ready &&
            this.connection.joinConfig.channelId === channelId &&
            this.lastChannelId === channelId &&
            this.lastGuildId === guildId) {
            return;
        }

        // Connection verbindet gerade → warten
        if (this.connection &&
            (this.connection.state.status === 'connecting' || this.connection.state.status === 'signalling') &&
            this.connection.joinConfig.channelId === channelId) {
            await this.waitForConnectionReady();
            return;
        }

        // Komplett neu aufbauen nötig? Nur wenn keine Connection, zerstört oder anderer Guild.
        // Für Kanalwechsel im selben Guild NICHT destroy() aufrufen — joinVoiceChannel
        // updated die bestehende Connection, die Player-Subscription bleibt erhalten
        // → laufender Sound wird nicht unterbrochen.
        const mustRebuild = !this.connection ||
            this.connection.state.status === VoiceConnectionStatus.Destroyed ||
            this.connection.state.status === 'disconnected' ||
            this.lastGuildId !== guildId;

        if (mustRebuild && this.connection) {
            try {
                this.connection.removeAllListeners();
                this.connection.destroy();
            } catch (_) {}
            this.connection = null;
        }

        const needsJoin = mustRebuild || this.lastChannelId !== channelId;

        if (needsJoin) {
            const isNew = !this.connection;

            // joinVoiceChannel erstellt neue Connection ODER bewegt bestehende in
            // anderen Kanal — gibt dabei immer das selbe Connection-Objekt zurück,
            // sodass connection.subscribe(player) gültig bleibt.
            this.connection = joinVoiceChannel({
                channelId: channelId,
                guildId: guildId,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });

            if (isNew) {
                // Nur bei echter neuer Connection Events registrieren
                this.setupConnectionEvents(this.connection);
            }

            this.lastChannelId = channelId;
            this.lastGuildId = guildId;

            if (this.connection.state.status !== VoiceConnectionStatus.Ready) {
                await this.waitForConnectionReady();
            }
        }
    }

    async waitForConnectionReady() {
        if (!this.connection) {
            throw new Error('Keine Connection vorhanden');
        }

        if (this.connection.state.status === VoiceConnectionStatus.Ready) {
            return;
        }

        return new Promise((resolve, reject) => {
            // Give enough time for a channel switch (Discord needs a moment).
            const timeout = setTimeout(() => {
                cleanup();
                resolve();
            }, 5000);

            const cleanup = () => {
                clearTimeout(timeout);
                this.connection?.off(VoiceConnectionStatus.Ready, onReady);
                this.connection?.off(VoiceConnectionStatus.Destroyed, onError);
            };

            const onReady = () => { cleanup(); resolve(); };
            // Only treat Destroyed as a fatal error — Disconnected is transient during
            // channel switches and must not abort the connection attempt.
            const onError = () => { cleanup(); reject(new Error('Connection failed')); };

            this.connection.on(VoiceConnectionStatus.Ready, onReady);
            this.connection.on(VoiceConnectionStatus.Destroyed, onError);

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
        await this.playSound(interaction, randomSound.label, false, false);
    }

    async stopSound() {
        if (this.player && this.player.state.status === AudioPlayerStatus.Playing) {
            this.player.stop(true);
        }
    }

    async disconnect() {
        this.clearLeaveTimeout();

        // Player aufräumen
        if (this.player) {
            try {
                this.player.stop(true);
                this.player.removeAllListeners();
            } catch (e) {}
            this.player = null;
        }

        // Connection trennen
        if (this.connection) {
            try {
                this.connection.destroy();
            } catch (e) {}
            this.connection = null;
            this.lastChannelId = null;
            this.lastGuildId = null;
            stateManager.setCurrentlyPlayingSound('');
        }
    }

    // ========== AUTO-LEAVE WENN CHANNEL LEER ==========
    clearLeaveTimeout() {
        if (this.leaveTimeout) {
            clearTimeout(this.leaveTimeout);
            this.leaveTimeout = null;
            console.log('⏱️ [AUTO-LEAVE] Timeout gelöscht');
        }
    }

    checkChannelAndScheduleLeave(channel) {
        if (!this.connection || !channel) {
            return;
        }

        // Zähle nur echte User (keine Bots)
        const realUsers = channel.members.filter(member => !member.user.bot);
        const realUserCount = realUsers.size;

        if (realUserCount === 0) {
            // Keine echten User mehr - starte Leave-Timer
            if (!this.leaveTimeout) {
                console.log(`⏱️ [AUTO-LEAVE] Starte ${this.leaveDelay / 1000}s Timer zum Verlassen...`);
                this.logToFile(`[AUTO-LEAVE] No real users in channel, starting ${this.leaveDelay / 1000}s leave timer`);

                this.leaveTimeout = setTimeout(() => {
                    this.leaveTimeout = null;
                    const currentChannel = channel.guild.channels.cache.get(channel.id);
                    if (!currentChannel) {
                        console.log('👋 [AUTO-LEAVE] Channel nicht gefunden - verlasse Channel');
                        this.logToFile('[AUTO-LEAVE] Channel missing, leaving channel');
                        this.disconnect();
                        return;
                    }

                    const currentRealUsers = currentChannel.members.filter(member => !member.user.bot).size;
                    if (currentRealUsers > 0) {
                        console.log(`✅ [AUTO-LEAVE] User wieder da (${currentRealUsers}) - bleibe im Channel`);
                        this.logToFile(`[AUTO-LEAVE] Users rejoined (${currentRealUsers}), staying in channel`);
                        return;
                    }

                    console.log('👋 [AUTO-LEAVE] Zeit abgelaufen - verlasse Channel');
                    this.logToFile('[AUTO-LEAVE] Timer expired, leaving channel');
                    this.disconnect();
                }, this.leaveDelay);
            }
        } else {
            // Es sind noch echte User da - Timeout löschen falls vorhanden
            this.clearLeaveTimeout();
        }
    }

    handleVoiceStateUpdate(oldState, newState, client) {
        // Prüfe ob der Bot in einem Channel ist
        if (!this.connection || !this.lastChannelId) {
            return;
        }

        // Prüfe ob das Event unseren Channel betrifft
        const botChannelId = this.lastChannelId;

        // User hat unseren Channel verlassen oder ist rein gekommen
        if (oldState.channelId === botChannelId || newState.channelId === botChannelId) {
            const guild = oldState.guild || newState.guild;
            const channel = guild.channels.cache.get(botChannelId);

            if (channel) {
                this.checkChannelAndScheduleLeave(channel);
            }
        }
    }

    // ========== HELPER METHODS ==========
    appendLogEntry(message) {
        fs.appendFile(SOUND_LOGS_PATH, message + "\n", 'utf8', (error) => {
            if (error) {
                console.error('[LOG] Schreiben fehlgeschlagen:', error.message);
            }
        });
    }

    logToFile(message) {
        const berlinTime = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
        const logEntry = `${berlinTime} - ${message}`;
        this.appendLogEntry(logEntry);
    }

    async sendTempNotice(context, content, timeoutMs = 3000) {
        let message;
        const isMessage = context?.constructor?.name === 'Message';
        try {
            if (isMessage && context?.channel) {
                message = await context.channel.send({ content, allowedMentions: { parse: [] } });
            } else if (context?.deferred || context?.replied) {
                message = await context.followUp({ content, allowedMentions: { parse: [] } });
            } else if (typeof context?.reply === 'function') {
                message = await context.reply({ content, allowedMentions: { parse: [] } });
            }
        } catch (error) {
            console.log('[NOTICE] Konnte Hinweis nicht senden:', error.message);
            return;
        }

        if (message?.deletable) {
            setTimeout(() => {
                message.delete().catch(console.error);
            }, timeoutMs);
        }
    }
}

module.exports = new AudioService();
