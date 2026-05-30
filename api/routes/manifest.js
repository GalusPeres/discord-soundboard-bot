const { Router } = require('express');
const pkg = require('../../package.json');

function botIdentity(client) {
    if (!client.user) return null;
    return {
        id: client.user.id,
        tag: client.user.tag,
        username: client.user.username,
        displayName: client.user.username,
        applicationName: client.application?.name || null,
        avatar: client.user.displayAvatarURL(),
    };
}

function manifestRoutes(client) {
    const router = Router();

    router.get('/', (req, res) => {
        res.json({
            apiVersion: 1,
            id: 'sound',
            type: 'soundboard',
            name: pkg.name,
            displayName: client.user?.username || 'Sound Bot',
            description: 'Discord soundboard bot with local sound files.',
            icon: 'soundboard',
            bot: botIdentity(client),
            capabilities: ['status', 'guilds', 'logs', 'stats', 'settings', 'soundboard', 'sound-files', 'voice'],
            pages: [
                { id: 'soundboard', label: 'Soundboard', icon: 'grid', kind: 'soundboard' },
                { id: 'library', label: 'Sound Library', icon: 'library', kind: 'file-library' },
                { id: 'stats', label: 'Statistics', icon: 'stats', kind: 'stats' },
                { id: 'logs', label: 'Live Logs', icon: 'logs', kind: 'logs' },
                { id: 'settings', label: 'Settings', icon: 'settings', kind: 'settings' },
            ],
            endpoints: {
                status: '/api/status',
                guilds: '/api/guilds',
                logs: '/api/logs',
                logStream: '/api/logs/stream',
                stats: '/api/stats',
                settings: '/api/settings',
                settingsSchema: '/api/settings/schema',
                sounds: '/api/sounds',
                play: '/api/play',
            },
        });
    });

    return router;
}

module.exports = manifestRoutes;
