class StateManager {
    constructor() {
        this.currentPageIndex = 0;
        this.currentInteraction = null;
        this.currentPlayingFileName = '';
        this.currentlyPlayingSound = null;
        this.currentComponents = null;
        this.messageStates = new Map();
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
        this.currentComponents = null;
        this.messageStates.clear();
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
    getCurrentComponents() { return this.currentComponents; }
    getMessageState(messageId) { return this.messageStates.get(messageId); }
    getPendingUploads() { return this.pendingUploads; }
    getActiveUploaders() { return this.activeUploaders; }

    // Setters
    setCurrentInteraction(interaction) { this.currentInteraction = interaction; }
    setCurrentPlayingFileName(filename) { this.currentPlayingFileName = filename; }
    setCurrentlyPlayingSound(sound) { this.currentlyPlayingSound = sound; }
    setCurrentComponents(components) { this.currentComponents = components; }
    setMessageState(message, menuType, components) {
        if (!message || !message.id) {
            return;
        }
        this.messageStates.set(message.id, { message, menuType, components });
    }
    updateSoundboardState(updates) { Object.assign(this.soundboardState, updates); }
}

module.exports = new StateManager();
