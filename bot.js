const { Client, GatewayIntentBits } = require('discord.js');
const { token } = require('./config/config.json');
const { initializeBot } = require('./utils/initialization');
const messageHandler = require('./handlers/messageHandler');
const buttonHandler = require('./handlers/buttonHandler');
const audioService = require('./services/audioService');

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
client.once('ready', () => {
    console.log(`Eingeloggt als ${client.user.tag}`);
    initializeBot();
});

client.on('messageCreate', messageHandler);
client.on('interactionCreate', buttonHandler);

// Audio Player Events Setup
audioService.setupAudioEvents();

client.login(token);