const fs = require('fs');
const path = require('path');
const { SOUNDS_DIR, SOUND_COUNTS_PATH, SOUNDS_PER_PAGE } = require('./constants');

class SoundUtils {
    constructor() {
        this.soundCounts = null;
        this.soundCountsDirty = false;
        this.soundCountsFlushTimer = null;
    }

    ensureSoundCountsLoaded() {
        if (this.soundCounts !== null) {
            return;
        }
        try {
            const raw = fs.readFileSync(SOUND_COUNTS_PATH, 'utf8');
            this.soundCounts = JSON.parse(raw);
        } catch (error) {
            this.soundCounts = {};
        }
    }

    scheduleSoundCountsFlush(delayMs = 2000) {
        if (this.soundCountsFlushTimer) {
            return;
        }
        this.soundCountsFlushTimer = setTimeout(() => {
            this.soundCountsFlushTimer = null;
            this.flushSoundCounts();
        }, delayMs);
    }

    flushSoundCounts() {
        if (!this.soundCountsDirty) {
            return;
        }
        const payload = JSON.stringify(this.soundCounts ?? {}, null, 2);
        this.soundCountsDirty = false;
        fs.writeFile(SOUND_COUNTS_PATH, payload, 'utf8', (error) => {
            if (error) {
                console.error('Fehler beim Schreiben der Sound-Counts-Datei:', error);
                this.soundCountsDirty = true;
                this.scheduleSoundCountsFlush(5000);
            }
        });
    }

    getSoundboardButtons() {
        if (!fs.existsSync(SOUNDS_DIR)) {
            fs.mkdirSync(SOUNDS_DIR, { recursive: true });
            return [];
        }
        
        const soundFiles = fs.readdirSync(SOUNDS_DIR).filter(file => file.endsWith('.mp3'));
        return soundFiles.map(file => {
            const soundName = file.replace('.mp3', '');
            return {
                label: soundName,
                customId: `sound_${soundName}`,
                style: 'Primary'
            };
        });
    }

    paginateButtons(buttons) {
        const pages = [];
        for (let i = 0; i < buttons.length; i += SOUNDS_PER_PAGE) {
            pages.push(buttons.slice(i, i + SOUNDS_PER_PAGE));
        }
        return pages;
    }

    getFavoriteSounds() {
        this.ensureSoundCountsLoaded();
        if (!this.soundCounts || Object.keys(this.soundCounts).length === 0) {
            return [];
        }
        
        // Filtere nur Sounds die noch existieren
        const existingSounds = Object.entries(this.soundCounts).filter(([soundFile]) => {
            const soundPath = path.join(SOUNDS_DIR, soundFile);
            return fs.existsSync(soundPath);
        });
        
        return existingSounds
            .sort((a, b) => b[1] - a[1]) // Höchste zuerst
            .map(entry => path.basename(entry[0], '.mp3')); // Nur Dateinamen ohne Erweiterung
    }

    getNewestSounds() {
        if (!fs.existsSync(SOUNDS_DIR)) {
            return [];
        }
        
        const soundFiles = fs.readdirSync(SOUNDS_DIR)
            .filter(file => file.endsWith('.mp3'))
            .map(file => {
                const stats = fs.statSync(path.join(SOUNDS_DIR, file));
                return {
                    name: file,
                    mtime: stats.mtime.getTime()
                };
            });

        soundFiles.sort((a, b) => b.mtime - a.mtime);
        return soundFiles.slice(0, 10).map(file => path.basename(file.name, '.mp3'));
    }

    updateSoundCount(filePath) {
        this.ensureSoundCountsLoaded();
        const soundName = path.basename(filePath);
        if (!this.soundCounts) {
            this.soundCounts = {};
        }
        this.soundCounts[soundName] = (this.soundCounts[soundName] || 0) + 1;
        this.soundCountsDirty = true;
        this.scheduleSoundCountsFlush();
    }

    getTotalPages() {
        if (!fs.existsSync(SOUNDS_DIR)) {
            return 1;
        }
        
        const totalSounds = fs.readdirSync(SOUNDS_DIR).filter(file => file.endsWith('.mp3')).length;
        return Math.ceil(totalSounds / SOUNDS_PER_PAGE) || 1;
    }

    getPaginatedSoundsList(page, soundsPerPage = 60) {
        if (!fs.existsSync(SOUNDS_DIR)) {
            return { codeBlock: 'Keine Sounds verfügbar', totalPages: 1 };
        }
        
        const soundFiles = fs.readdirSync(SOUNDS_DIR).filter(file => file.endsWith('.mp3'));
        const sortedSoundFiles = soundFiles.sort();
        const totalPages = Math.ceil(sortedSoundFiles.length / soundsPerPage) || 1;

        const pageStartIndex = (page - 1) * soundsPerPage;
        const pageSounds = sortedSoundFiles.slice(pageStartIndex, pageStartIndex + soundsPerPage);

        if (pageSounds.length === 0) {
            return { codeBlock: 'Keine Sounds verfügbar', totalPages };
        }

        let codeBlock = '```\n';
        for (let i = 0; i < pageSounds.length; i += 3) {
            codeBlock += pageSounds.slice(i, i + 3)
                .map(file => '8' + file.replace('.mp3', '').padEnd(11)).join('') + '\n';
        }
        codeBlock += '```';

        return { codeBlock, totalPages };
    }
}

module.exports = new SoundUtils();
