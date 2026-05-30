const { Router } = require('express');
const fs = require('fs');
const { SOUNDS_DIR, SOUND_COUNTS_PATH } = require('../../utils/constants');
const audioService = require('../../services/audioService');

function readCounts() {
    try {
        return JSON.parse(fs.readFileSync(SOUND_COUNTS_PATH, 'utf-8'));
    } catch {
        return {};
    }
}

function soundFiles() {
    try {
        return fs.readdirSync(SOUNDS_DIR).filter((file) => file.endsWith('.mp3'));
    } catch {
        return [];
    }
}

function statsRoutes(client) {
    const router = Router();

    router.get('/', (req, res) => {
        const files = soundFiles();
        const counts = readCounts();
        const totalPlays = Object.values(counts).reduce((sum, count) => sum + Number(count || 0), 0);
        const topSounds = files
            .map((file) => ({
                name: file.replace(/\.mp3$/, ''),
                file,
                plays: Number(counts[file] || 0),
            }))
            .sort((a, b) => b.plays - a.plays)
            .slice(0, 20);

        res.json({
            updatedAt: new Date().toISOString(),
            scope: 'live-and-file',
            cards: [
                { key: 'guilds', label: 'Servers', value: client.guilds?.cache?.size || 0 },
                { key: 'sounds', label: 'Sounds', value: files.length },
                { key: 'plays', label: 'Total plays', value: totalPlays },
                {
                    key: 'voice',
                    label: 'Voice',
                    value: audioService.connection ? 'connected' : 'idle',
                    status: audioService.connection ? 'ok' : 'neutral',
                },
            ],
            health: [
                {
                    key: 'discord',
                    label: 'Discord gateway',
                    status: client.isReady?.() ? 'ok' : 'warn',
                    detail: client.isReady?.() ? 'ready' : 'not ready',
                },
                {
                    key: 'voice',
                    label: 'Voice connection',
                    status: audioService.connection ? 'ok' : 'neutral',
                    detail: audioService.lastGuildId
                        ? `guild ${audioService.lastGuildId}, channel ${audioService.lastChannelId}`
                        : 'not connected',
                },
            ],
            charts: [],
            tables: [
                {
                    key: 'topSounds',
                    label: 'Top sounds',
                    rows: topSounds,
                },
            ],
        });
    });

    return router;
}

module.exports = statsRoutes;
