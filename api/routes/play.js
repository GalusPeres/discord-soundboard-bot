const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const { SOUNDS_DIR } = require('../../utils/constants');
const audioService = require('../../services/audioService');
const stateManager = require('../../utils/stateManager');
const { createAudioResource, StreamType } = require('@discordjs/voice');
const soundUtils = require('../../utils/soundUtils');

function playRoutes(client) {
    const router = Router();

    router.get('/', (req, res) => {
        res.json({
            current: stateManager.currentlyPlayingSound || null,
            channelId: audioService.lastChannelId,
            guildId: audioService.lastGuildId,
        });
    });

    router.post('/', async (req, res) => {
        const { guildId, channelId, sound } = req.body || {};
        if (!guildId || !channelId || !sound) {
            return res.status(400).json({ error: 'guildId, channelId, sound required' });
        }
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return res.status(404).json({ error: 'guild not found' });
        const channel = guild.channels.cache.get(channelId);
        if (!channel || channel.type !== 2) return res.status(404).json({ error: 'voice channel not found' });

        const file = path.join(SOUNDS_DIR, `${sound}.mp3`);
        if (!fs.existsSync(file)) return res.status(404).json({ error: 'sound not found' });

        try {
            await audioService.ensureVoiceConnection(channel);
            const player = audioService.createFreshPlayer();
            const resource = createAudioResource(file, { inputType: StreamType.Arbitrary, inlineVolume: false });
            player.play(resource);
            audioService.connection.subscribe(player);
            stateManager.setCurrentPlayingFileName(sound);
            stateManager.setCurrentlyPlayingSound(sound);
            soundUtils.updateSoundCount(file);
            res.json({ playing: sound, channelId, guildId });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/connect', async (req, res) => {
        const { guildId, channelId } = req.body || {};
        if (!guildId || !channelId) return res.status(400).json({ error: 'guildId and channelId required' });
        const guild = client.guilds.cache.get(guildId);
        const channel = guild?.channels.cache.get(channelId);
        if (!channel || channel.type !== 2) return res.status(404).json({ error: 'voice channel not found' });
        try {
            await audioService.ensureVoiceConnection(channel);
            res.json({ connected: true, guildId, channelId });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.delete('/', async (req, res) => {
        try {
            await audioService.stopSound();
            res.json({ stopped: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/disconnect', async (req, res) => {
        try {
            await audioService.disconnect();
            res.json({ disconnected: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}

module.exports = playRoutes;
