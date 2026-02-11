const { Client, GatewayIntentBits } = require('discord.js');
const { initializeBot } = require('./utils/initialization');
const messageHandler = require('./handlers/messageHandler');
const buttonHandler = require('./handlers/buttonHandler');
const audioService = require('./services/audioService');
const { startWebServer } = require('./web/server.cjs');

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

const token = loadBotToken();

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
    if (!webServer) {
        webServer = startWebServer({ client, audioService });
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
