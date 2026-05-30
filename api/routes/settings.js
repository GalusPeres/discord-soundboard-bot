const { Router } = require('express');
const { ENV_VARS, publicConfig } = require('../../config/env');
const { writeEnvUpdates } = require('../envFile');
const audioService = require('../../services/audioService');

const EDITABLE_KEYS = new Set(['prefix', 'maxUploadSizeMb', 'maxFilenameLength', 'autoLeaveDelayMs']);
const NUMBER_KEYS = new Set(['maxUploadSizeMb', 'maxFilenameLength', 'autoLeaveDelayMs']);
const LABELS = Object.freeze({
    prefix: 'Command prefix',
    maxUploadSizeMb: 'Max upload size',
    maxFilenameLength: 'Max filename length',
    autoLeaveDelayMs: 'Auto leave delay',
});

function settingsSchema() {
    return {
        managedBy: 'environment',
        sections: [
            {
                id: 'general',
                label: 'General',
                fields: ['prefix', 'maxUploadSizeMb', 'maxFilenameLength', 'autoLeaveDelayMs'].map((key) => ({
                    key,
                    env: ENV_VARS[key],
                    label: LABELS[key] || key,
                    type: NUMBER_KEYS.has(key) ? 'number' : 'text',
                    editable: EDITABLE_KEYS.has(key),
                    restartRequired: false,
                    secret: false,
                })),
            },
        ],
    };
}

function settingsRoutes() {
    const router = Router();

    router.get('/schema', (req, res) => {
        res.json(settingsSchema());
    });

    router.get('/', (req, res) => {
        res.json({
            ...publicConfig(),
            managedBy: 'environment',
            environmentVariables: ENV_VARS,
        });
    });

    router.put('/', async (req, res) => {
        try {
            const patch = req.body || {};
            const applied = {};
            const envUpdates = {};
            const current = publicConfig();

            for (const [key, rawValue] of Object.entries(patch)) {
                if (!EDITABLE_KEYS.has(key)) {
                    return res.status(400).json({ error: `setting is not editable: ${key}` });
                }
                let value = rawValue;
                if (typeof current[key] === 'number') {
                    value = Number(rawValue);
                    if (!Number.isFinite(value) || value < 0) {
                        return res.status(400).json({ error: `invalid number for ${key}` });
                    }
                } else {
                    value = String(rawValue ?? '').trim();
                    if (!value) return res.status(400).json({ error: `empty value for ${key}` });
                }
                applied[key] = value;
                envUpdates[ENV_VARS[key]] = value;
            }

            if (!Object.keys(applied).length) {
                return res.status(400).json({ error: 'no editable settings supplied' });
            }

            await writeEnvUpdates(envUpdates);
            for (const [key, value] of Object.entries(envUpdates)) process.env[key] = String(value);
            if (applied.autoLeaveDelayMs !== undefined) audioService.leaveDelay = applied.autoLeaveDelayMs;
            res.json({
                ...publicConfig(),
                managedBy: 'environment',
                environmentVariables: ENV_VARS,
                saved: Object.keys(applied),
                restartRequired: false,
            });
        } catch (err) {
            res.status(500).json({ error: `failed to update .env: ${err.message}` });
        }
    });

    return router;
}

module.exports = settingsRoutes;
