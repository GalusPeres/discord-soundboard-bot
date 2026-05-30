const { Router } = require('express');
const fs = require('fs');
const pkg = require('../../package.json');
const { SOUNDS_DIR } = require('../../utils/constants');
const audioService = require('../../services/audioService');

function statusRoutes(client) {
    const router = Router();
    const startedAt = Date.now();

    router.get('/', (req, res) => {
        let soundCount = 0;
        try {
            soundCount = fs.readdirSync(SOUNDS_DIR).filter((f) => f.endsWith('.mp3')).length;
        } catch (_) {}

        res.json({
            name: pkg.name,
            version: pkg.version,
            bot: client.user
                ? {
                    id: client.user.id,
                    tag: client.user.tag,
                    username: client.user.username,
                    displayName: client.user.username,
                    applicationName: client.application?.name || null,
                    avatar: client.user.displayAvatarURL(),
                }
                : null,
            ready: client.isReady ? client.isReady() : false,
            uptimeMs: Date.now() - startedAt,
            guildCount: client.guilds.cache.size,
            soundCount,
            voiceChannelId: audioService.connection ? audioService.lastChannelId : null,
            voiceGuildId: audioService.connection ? audioService.lastGuildId : null,
        });
    });

    return router;
}

module.exports = statusRoutes;
