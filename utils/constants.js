const path = require('path');
const { publicConfig } = require('../config/env');

const config = publicConfig();

function configuredPath(name, fallback) {
    return process.env[name] ? path.resolve(process.env[name]) : fallback;
}

module.exports = {
    // Bot Config
    PREFIX: config.prefix,

    // URLs
    GIF_URL: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHNodWJ1aTgxY2JybmVkbWM3bTFnZWNuZDdtMHoyNGU4cnpmNHF3NiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/VcNHywtPkcpwCexxTp/giphy.gif',
    PNG_URL: 'https://i.postimg.cc/Zn6vqjY2/placeholder.png',
    
    // File Paths
    SOUND_COUNTS_PATH: configuredPath('SOUND_COUNTS_PATH', '/app/config/soundCounts.json'),
    SOUND_LOGS_PATH: configuredPath('SOUND_LOGS_PATH', '/app/config/sound_logs.txt'),
    SOUNDS_DIR: configuredPath('SOUNDS_DIR', path.join(__dirname, '../sounds')),
    TEMP_DIR: configuredPath('TEMP_DIR', path.join(__dirname, '../temp')),
    
    // Settings
    SOUNDS_PER_PAGE: 20,
    MAX_FILE_SIZE: config.maxUploadSizeMb * 1024 * 1024,
    MAX_FILENAME_LENGTH: config.maxFilenameLength,
    AUTO_LEAVE_DELAY_MS: config.autoLeaveDelayMs,
    CHUNK_SIZE: 9.98 * 1024 * 1024, // 9.98MB

    // Delays (ms)
    DELAYS: {
        MESSAGE_DELETE: 3000,
        MESSAGE_DELETE_LONG: 5000,
        ERROR_MESSAGE: 8000,
        TEMP_CLEANUP: 10000
    },

    // Colors
    COLORS: {
        PRIMARY: 0x00AE86,
        SUCCESS: 0x00FF00,
        WARNING: 0xFFAA00,
        ERROR: 0xFF0000,
        INFO: 0x0099FF
    }
};
