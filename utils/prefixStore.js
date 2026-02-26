const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../config/config.json');
const DEFAULT_PREFIX = '8';
const MAX_PREFIX_LENGTH = 5;

let currentPrefix = DEFAULT_PREFIX;

function normalizePrefix(value, fallback = DEFAULT_PREFIX) {
    if (typeof value !== 'string') {
        return fallback;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_PREFIX_LENGTH || /\s/.test(trimmed)) {
        return fallback;
    }

    return trimmed;
}

function loadPrefixFromConfig() {
    try {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        return normalizePrefix(parsed?.prefix, DEFAULT_PREFIX);
    } catch {
        return DEFAULT_PREFIX;
    }
}

function getPrefix() {
    return currentPrefix;
}

function setPrefix(nextPrefix) {
    currentPrefix = normalizePrefix(nextPrefix, currentPrefix || DEFAULT_PREFIX);
    return currentPrefix;
}

function reloadPrefix() {
    currentPrefix = loadPrefixFromConfig();
    return currentPrefix;
}

currentPrefix = loadPrefixFromConfig();

module.exports = {
    DEFAULT_PREFIX,
    getPrefix,
    reloadPrefix,
    setPrefix
};
