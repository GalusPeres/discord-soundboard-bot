const fs = require('fs');
const path = require('path');
const { SOUND_COUNTS_PATH, SOUND_LOGS_PATH, SOUNDS_DIR } = require('./constants');
const stateManager = require('./stateManager');

function initializeBot() {
    // Reset States
    stateManager.resetAll();
    
    // Erstelle Sound Counts Datei
    if (!fs.existsSync(SOUND_COUNTS_PATH)) {
        fs.writeFileSync(SOUND_COUNTS_PATH, JSON.stringify({}));
    }
    
    // Erstelle Logs Ordner
    const logsDir = path.dirname(SOUND_LOGS_PATH);
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Erstelle Sounds Ordner
    if (!fs.existsSync(SOUNDS_DIR)) {
        fs.mkdirSync(SOUNDS_DIR, { recursive: true });
    }
    
    console.log('Bot initialisiert');
}

module.exports = { initializeBot };