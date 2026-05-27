const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { SOUNDS_DIR, SOUND_COUNTS_PATH } = require('../../utils/constants');
const { publicConfig } = require('../../config/env');

const VALID_NAME = /^[a-z0-9]+$/;

function readCounts() {
    try {
        return JSON.parse(fs.readFileSync(SOUND_COUNTS_PATH, 'utf-8'));
    } catch {
        return {};
    }
}

function inferDuration(sizeBytes) {
    // Rough MP3 bitrate-based estimate (128 kbps default). Good enough for the UI;
    // the bot doesn't read ID3/duration server-side and we don't want to spawn ffprobe per file.
    const seconds = Math.max(1, Math.round((sizeBytes * 8) / (128 * 1024)));
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function listSounds() {
    if (!fs.existsSync(SOUNDS_DIR)) return [];
    const counts = readCounts();
    return fs
        .readdirSync(SOUNDS_DIR)
        .filter((f) => f.endsWith('.mp3'))
        .map((file) => {
            const full = path.join(SOUNDS_DIR, file);
            const stat = fs.statSync(full);
            const name = file.replace(/\.mp3$/, '');
            return {
                name,
                file,
                size: stat.size,
                duration: inferDuration(stat.size),
                plays: counts[file] || 0,
                added: stat.mtimeMs,
            };
        })
        .sort((a, b) => b.plays - a.plays);
}

function createUpload() {
    const settings = publicConfig();
    return multer({
        storage: multer.diskStorage({
            destination: (req, file, cb) => {
                if (!fs.existsSync(SOUNDS_DIR)) fs.mkdirSync(SOUNDS_DIR, { recursive: true });
                cb(null, SOUNDS_DIR);
            },
            filename: (req, file, cb) => {
                const targetName = (req.body.name || path.basename(file.originalname, '.mp3'))
                    .toLowerCase()
                    .replace(/\s+/g, '');
                if (!VALID_NAME.test(targetName) || targetName.length > settings.maxFilenameLength) {
                    return cb(new Error(`invalid name (lowercase a-z 0-9, max ${settings.maxFilenameLength} chars)`));
                }
                cb(null, `${targetName}.mp3`);
            },
        }),
        limits: { fileSize: settings.maxUploadSizeMb * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            if (!/audio\/(mpeg|mp3)/.test(file.mimetype) && !file.originalname.toLowerCase().endsWith('.mp3')) {
                return cb(new Error('only .mp3 files accepted'));
            }
            cb(null, true);
        },
    });
}

function soundsRoutes() {
    const router = Router();

    router.get('/', (req, res) => {
        res.json(listSounds());
    });

    router.get('/:name/file', (req, res) => {
        const name = req.params.name.toLowerCase();
        if (!VALID_NAME.test(name) || name.length > publicConfig().maxFilenameLength) {
            return res.status(400).json({ error: 'invalid sound name' });
        }
        const file = path.join(SOUNDS_DIR, `${name}.mp3`);
        if (!fs.existsSync(file)) return res.status(404).json({ error: 'sound not found' });
        res.type('audio/mpeg').sendFile(file);
    });

    router.post('/', (req, res) => {
        createUpload().single('file')(req, res, (err) => {
            if (err) return res.status(400).json({ error: err.message });
            if (!req.file) return res.status(400).json({ error: 'file required' });
            const name = req.file.filename.replace(/\.mp3$/, '');
            const stat = fs.statSync(req.file.path);
            res.status(201).json({
                name,
                file: req.file.filename,
                size: stat.size,
                duration: inferDuration(stat.size),
                plays: 0,
                added: stat.mtimeMs,
            });
        });
    });

    router.patch('/:name', (req, res) => {
        const name = req.params.name.toLowerCase();
        const newName = (req.body?.name || '').toLowerCase().replace(/\s+/g, '');
        if (!VALID_NAME.test(newName) || newName.length > publicConfig().maxFilenameLength) {
            return res.status(400).json({ error: 'invalid new name' });
        }
        const src = path.join(SOUNDS_DIR, `${name}.mp3`);
        const dst = path.join(SOUNDS_DIR, `${newName}.mp3`);
        if (!fs.existsSync(src)) return res.status(404).json({ error: 'sound not found' });
        if (fs.existsSync(dst)) return res.status(409).json({ error: 'target name already exists' });
        fs.renameSync(src, dst);

        const counts = readCounts();
        if (counts[`${name}.mp3`] != null) {
            counts[`${newName}.mp3`] = counts[`${name}.mp3`];
            delete counts[`${name}.mp3`];
            fs.writeFileSync(SOUND_COUNTS_PATH, JSON.stringify(counts, null, 2));
        }
        res.json({ name: newName });
    });

    router.delete('/:name', (req, res) => {
        const name = req.params.name.toLowerCase();
        const file = path.join(SOUNDS_DIR, `${name}.mp3`);
        if (!fs.existsSync(file)) return res.status(404).json({ error: 'sound not found' });
        fs.unlinkSync(file);
        const counts = readCounts();
        if (counts[`${name}.mp3`] != null) {
            delete counts[`${name}.mp3`];
            fs.writeFileSync(SOUND_COUNTS_PATH, JSON.stringify(counts, null, 2));
        }
        res.json({ deleted: name });
    });

    return router;
}

module.exports = soundsRoutes;
