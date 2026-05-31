const { Router } = require('express');
const { serializeGuild } = require('../serialize');

function guildsRoutes(client) {
    const router = Router();

    router.get('/', (req, res) => {
        const userId = req.get('x-dashboard-user-id');
        const guilds = [...client.guilds.cache.values()].map((guild) => serializeGuild(guild, userId));
        res.json(guilds);
    });

    router.get('/:id', (req, res) => {
        const guild = client.guilds.cache.get(req.params.id);
        if (!guild) return res.status(404).json({ error: 'guild not found' });
        res.json(serializeGuild(guild, req.get('x-dashboard-user-id')));
    });

    router.get('/:id/members', async (req, res) => {
        const guild = client.guilds.cache.get(req.params.id);
        if (!guild) return res.status(404).json({ error: 'guild not found' });
        try {
            const members = await guild.members.fetch({ limit: 1000 });
            res.json(
                [...members.values()]
                    .filter((m) => !m.user.bot)
                    .map((m) => ({
                        id: m.user.id,
                        username: m.user.username,
                        global_name: m.user.globalName || m.user.username,
                        avatar: m.user.displayAvatarURL({ size: 64, extension: 'png' }),
                    }))
                    .sort((a, b) => (a.global_name || a.username).localeCompare(b.global_name || b.username))
            );
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}

module.exports = guildsRoutes;
