const express = require('express');
const cors = require('cors');
const { bearerAuth } = require('./auth');
const consoleInterceptor = require('./consoleInterceptor');
const statusRoutes = require('./routes/status');
const guildsRoutes = require('./routes/guilds');
const soundsRoutes = require('./routes/sounds');
const playRoutes = require('./routes/play');
const settingsRoutes = require('./routes/settings');
const logsRoutes = require('./routes/logs');

function startApi(client) {
    if (!process.env.BOT_API_TOKEN) {
        throw new Error('Missing required environment variable: BOT_API_TOKEN');
    }
    consoleInterceptor.install();

    const port = Number(process.env.BOT_API_PORT) || 3002;
    const app = express();
    app.use(cors());
    app.use(express.json({ limit: '1mb' }));
    app.use(bearerAuth);

    app.use('/api/status', statusRoutes(client));
    app.use('/api/guilds', guildsRoutes(client));
    app.use('/api/sounds', soundsRoutes());
    app.use('/api/play', playRoutes(client));
    app.use('/api/settings', settingsRoutes());
    app.use('/api/logs', logsRoutes());

    app.use((err, req, res, _next) => {
        console.error('[api]', err);
        res.status(500).json({ error: err.message || 'internal error' });
    });

    return app.listen(port, '0.0.0.0', () => {
        console.log(`🌐 HTTP API listening on :${port}`);
    });
}

module.exports = { startApi };
