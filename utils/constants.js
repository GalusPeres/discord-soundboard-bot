const path = require('path');

module.exports = {
    // URLs
    GIF_URL: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHNodWJ1aTgxY2JybmVkbWM3bTFnZWNuZDdtMHoyNGU4cnpmNHF3NiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/VcNHywtPkcpwCexxTp/giphy.gif',
    PNG_URL: 'https://i.postimg.cc/Zn6vqjY2/placeholder.png',
    
    // File Paths
    SOUND_COUNTS_PATH: path.join(__dirname, '../config/soundCounts.json'),
    SOUND_LOGS_PATH: path.join(__dirname, '../config/sound_logs.txt'),
    SOUNDS_DIR: path.join(__dirname, '../sounds'),
    TEMP_DIR: path.join(__dirname, '../temp'),
    
    // Settings
    SOUNDS_PER_PAGE: 20,
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_FILENAME_LENGTH: 10,
    CHUNK_SIZE: 9.98 * 1024 * 1024, // 9.98MB
    
    // Colors
    COLORS: {
        PRIMARY: 0x00AE86,
        SUCCESS: 0x00FF00,
        WARNING: 0xFFAA00,
        ERROR: 0xFF0000,
        INFO: 0x0099FF
    }
};