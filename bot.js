const { Client, GatewayIntentBits } = require('discord.js');
const { token } = require('./config/config.json');
const { initializeBot } = require('./utils/initialization');
const messageHandler = require('./handlers/messageHandler');
const buttonHandler = require('./handlers/buttonHandler');
const audioService = require('./services/audioService');
const { startWebServer } = require('./web/server.cjs');

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
