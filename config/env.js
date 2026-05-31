const fs = require('node:fs');

// Load persisted settings from BOT_ENV_FILE (default /data/.env) into
// process.env before the bot config is read. Values in the file override
// the container ENV so Botboard-saved settings survive restarts.
function loadEnvFile() {
    const filePath = process.env.BOT_ENV_FILE || '/app/data/.env';
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const line of content.split(/\r?\n/)) {
            const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
            if (!match) continue;
            const key = match[1];
            let value = match[2].trim();
            // Strip surrounding quotes added by encodeValue
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            process.env[key] = value;
        }
    } catch (err) {
        if (err.code !== 'ENOENT') console.warn('[env] Could not load env file:', err.message);
    }
}

function required(env, name) {
    const value = env[name];
    if (!value) throw new Error(`Missing required environment variable: ${name}`);
    return value;
}

function text(env, name, fallback) {
    return env[name] ?? fallback;
}

function number(env, name, fallback) {
    const raw = env[name];
    if (raw === undefined || raw === '') return fallback;
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`Invalid numeric environment variable: ${name}`);
    return value;
}

const ENV_VARS = Object.freeze({
    token: 'DISCORD_TOKEN',
    prefix: 'COMMAND_PREFIX',
    maxUploadSizeMb: 'MAX_UPLOAD_SIZE_MB',
    maxFilenameLength: 'MAX_FILENAME_LENGTH',
    autoLeaveDelayMs: 'AUTO_LEAVE_DELAY_MS',
    soundsDir: 'SOUNDS_DIR',
    soundCountsPath: 'SOUND_COUNTS_PATH',
    soundLogsPath: 'SOUND_LOGS_PATH',
    tempDir: 'TEMP_DIR',
});

function publicConfig(env = process.env) {
    return {
        prefix: text(env, ENV_VARS.prefix, '8'),
        maxUploadSizeMb: number(env, ENV_VARS.maxUploadSizeMb, 10),
        maxFilenameLength: number(env, ENV_VARS.maxFilenameLength, 10),
        autoLeaveDelayMs: number(env, ENV_VARS.autoLeaveDelayMs, 30000),
    };
}

function loadConfig(env = process.env) {
    return {
        ...publicConfig(env),
        token: required(env, ENV_VARS.token),
    };
}

module.exports = { ENV_VARS, loadConfig, publicConfig, loadEnvFile };
