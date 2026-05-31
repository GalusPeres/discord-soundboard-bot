const { Client, GatewayIntentBits } = require('discord.js');
const { loadConfig, loadEnvFile } = require('./config/env');
loadEnvFile();
const { initializeBot } = require('./utils/initialization');
const messageHandler = require('./handlers/messageHandler');
const buttonHandler = require('./handlers/buttonHandler');
const audioService = require('./services/audioService');
const { startApi } = require('./api/server');

const { token } = loadConfig();

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
    if (process.env.BOT_API_TOKEN) {
        try {
            client.apiServer = startApi(client);
        } catch (err) {
            console.error('Failed to start dashboard HTTP API:', err);
        }
    } else {
        console.log('Dashboard HTTP API disabled (BOT_API_TOKEN is not configured).');
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

async function gracefulShutdown() {
    console.log('Shutting down...');
    if (client.apiServer) await new Promise((r) => client.apiServer.close(r));
    try { await audioService.disconnect(); } catch (_) {}
    client.destroy();
    process.exit(0);
}
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

client.login(token);
