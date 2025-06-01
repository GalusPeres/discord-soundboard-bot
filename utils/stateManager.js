class StateManager {
    constructor() {
        this.currentPageIndex = 0;
        this.currentInteraction = null;
        this.currentPlayingFileName = '';
        this.currentlyPlayingSound = null;
        this.pendingUploads = new Map();
        this.activeUploaders = new Set();
        this.soundboardState = {
            currentPageIndex: 0,
            inSoundboardMenu: false,
            inHelpMenu: false,
            inTop20Menu: false,
            currentHelpPageIndex: 0
        };
    }

    resetAll() {
        this.currentPageIndex = 0;
        this.currentInteraction = null;
        this.currentPlayingFileName = '';
        this.currentlyPlayingSound = null;
        this.pendingUploads.clear();
        this.activeUploaders.clear();
        this.soundboardState = {
            currentPageIndex: 0,
            inSoundboardMenu: false,
            inHelpMenu: false,
            inTop20Menu: false,
            currentHelpPageIndex: 0
        };
    }

    // Getters
    getCurrentInteraction() { return this.currentInteraction; }
    getCurrentPlayingFileName() { return this.currentPlayingFileName; }
    getSoundboardState() { return this.soundboardState; }
    getPendingUploads() { return this.pendingUploads; }
    getActiveUploaders() { return this.activeUploaders; }

    // Setters
    setCurrentInteraction(interaction) { this.currentInteraction = interaction; }
    setCurrentPlayingFileName(filename) { this.currentPlayingFileName = filename; }
    setCurrentlyPlayingSound(sound) { this.currentlyPlayingSound = sound; }
    updateSoundboardState(updates) { Object.assign(this.soundboardState, updates); }
}

module.exports = new StateManager();