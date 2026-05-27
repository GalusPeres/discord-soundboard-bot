// In-memory ring buffer for recent log entries + EventEmitter for live streaming.
// Used by the HTTP API so the Botboard dashboard can surface recent activity.

const { EventEmitter } = require('events');

const MAX_ENTRIES = 500;
const buffer = [];
const emitter = new EventEmitter();
emitter.setMaxListeners(50);

function push(entry) {
    const stamped = {
        time: entry.time || new Date().toISOString(),
        level: entry.level || 'info',
        src: entry.src || 'sound',
        text: entry.text,
    };
    buffer.push(stamped);
    if (buffer.length > MAX_ENTRIES) buffer.shift();
    emitter.emit('log', stamped);
    return stamped;
}

function recent(limit = 200) {
    if (limit >= buffer.length) return buffer.slice();
    return buffer.slice(buffer.length - limit);
}

function subscribe(handler) {
    emitter.on('log', handler);
    return () => emitter.off('log', handler);
}

module.exports = { push, recent, subscribe };
