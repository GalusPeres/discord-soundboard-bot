// Wraps console.log/info/warn/error so existing logs flow into the log buffer
// without touching every call site.

const logBuffer = require('./logBuffer');

const original = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
};

function format(args) {
    return args
        .map((a) => {
            if (a instanceof Error) return a.stack || a.message;
            if (typeof a === 'object') {
                try { return JSON.stringify(a); } catch { return String(a); }
            }
            return String(a);
        })
        .join(' ');
}

function inferSource(text) {
    if (/audio|sound|connection|voice|player/i.test(text)) return 'sound';
    if (/upload|download/i.test(text)) return 'io';
    return 'core';
}

function install() {
    if (console.__intercepted) return;
    console.__intercepted = true;
    for (const level of ['log', 'info', 'warn', 'error']) {
        console[level] = (...args) => {
            original[level](...args);
            const text = format(args);
            logBuffer.push({
                level: level === 'log' ? 'info' : level,
                src: inferSource(text),
                text,
            });
        };
    }
}

module.exports = { install };
