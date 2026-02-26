const { Client, GatewayIntentBits } = require('discord.js');
const { initializeBot } = require('./utils/initialization');
const messageHandler = require('./handlers/messageHandler');
const buttonHandler = require('./handlers/buttonHandler');
const audioService = require('./services/audioService');

function loadBotToken() {
    const envToken = typeof process.env.DISCORD_BOT_TOKEN === 'string'
        ? process.env.DISCORD_BOT_TOKEN.trim()
        : '';

    if (envToken.length > 0) {
        return envToken;
    }

    try {
        const config = require('./config/config.json');
        const configToken = typeof config?.token === 'string' ? config.token.trim() : '';
        if (configToken.length > 0) {
            return configToken;
        }
    } catch {
        // Continue to error below.
    }

    throw new Error('Missing Discord bot token. Set DISCORD_BOT_TOKEN or config/config.json token.');
}

function parseBoolean(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
        return true;
    }
    if (['0', 'false', 'no', 'off'].includes(normalized)) {
        return false;
    }

    return null;
}

function loadWebEnabled() {
    const envWebEnabled = parseBoolean(process.env.WEB_ENABLED);
    if (envWebEnabled !== null) {
        return envWebEnabled;
    }

    try {
        const config = require('./config/config.json');
        const webEnabled = config?.web?.enabled;

        if (typeof webEnabled === 'boolean') {
            return webEnabled;
        }

        if (typeof webEnabled === 'string') {
            const parsed = parseBoolean(webEnabled);
            if (parsed !== null) {
                return parsed;
            }
        }
    } catch {
        // Continue to default below.
    }

    return false;
}

const token = loadBotToken();
const webEnabled = loadWebEnabled();

let webServer = null;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages,
    ]
});

// Bot Events
client.once('clientReady', () => {
    console.log(`Eingeloggt als ${client.user.tag}`);
    initializeBot();

    if (!webEnabled) {
        console.log('[WEB] Dashboard disabled (set WEB_ENABLED=true to enable).');
        return;
    }

    if (!webServer) {
        try {
            const { startWebServer } = require('./web/server.cjs');
            webServer = startWebServer({ client, audioService });
        } catch (error) {
            console.error('[WEB] Dashboard could not be started:', error.message);
        }
    }
});

client.on('messageCreate', messageHandler);
client.on('interactionCreate', buttonHandler);

// Voice State Update - Auto-Leave wenn Channel leer
client.on('voiceStateUpdate', (oldState, newState) => {
    audioService.handleVoiceStateUpdate(oldState, newState, client);
});

// Audio Player Events Setup
audioService.setupAudioEvents();

client.login(token);
