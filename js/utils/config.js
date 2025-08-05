/**
 * Configuration Manager
 * Central source of truth for all extension settings and defaults
 */
class ConfigManager {
    constructor() {
        this.defaultSettings = {
            seekAmount: 5,  // Base seek amount in seconds for arrow keys
            volumeStep: 0.1, // Volume step (10%)
            enableNotifications: true,
            enableVolumeControl: true,
            enablePlaybackControl: true,
            enableSeekPreview: false
        };
        
        this.currentSettings = { ...this.defaultSettings };
        this.storageKey = 'seekerSettings';
        this.loaded = false;
        
        // Load settings on initialization
        this.loadSettings();
    }

    /**
     * Get default settings
     * @returns {Object} Default settings object
     */
    getDefaults() {
        return { ...this.defaultSettings };
    }

    /**
     * Get current settings
     * @returns {Object} Current settings object
     */
    getSettings() {
        return { ...this.currentSettings };
    }

    /**
     * Get a specific setting value
     * @param {string} key - Setting key
     * @param {*} fallback - Fallback value if setting doesn't exist
     * @returns {*} Setting value
     */
    get(key, fallback = null) {
        return this.currentSettings[key] !== undefined ? this.currentSettings[key] : fallback;
    }

    /**
     * Set a specific setting value
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     */
    set(key, value) {
        this.currentSettings[key] = value;
        this.saveSettings();
    }

    /**
     * Update multiple settings at once
     * @param {Object} newSettings - Settings to update
     */
    updateSettings(newSettings) {
        this.currentSettings = { ...this.currentSettings, ...newSettings };
        this.saveSettings();
    }

    /**
     * Reset settings to defaults
     */
    resetToDefaults() {
        this.currentSettings = { ...this.defaultSettings };
        this.saveSettings();
    }

    /**
     * Get seek amounts for different key bindings
     * @returns {Object} Seek amounts for different contexts
     */
    getSeekAmounts() {
        const baseAmount = this.get('seekAmount', 5);
        return {
            arrow: baseAmount,           // Arrow keys: base amount
            extended: baseAmount * 2,    // J/L keys: always double arrow amount
            large: 30                    // Large skip amount
        };
    }

    /**
     * Load settings from storage
     */
    async loadSettings() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const stored = await chrome.storage.sync.get(this.storageKey);
                if (stored[this.storageKey]) {
                    this.currentSettings = { ...this.defaultSettings, ...stored[this.storageKey] };
                    logger?.debug('Settings loaded from storage:', this.currentSettings);
                }
            }
            this.loaded = true;
        } catch (error) {
            logger?.warn('Could not load settings from storage:', error);
            this.currentSettings = { ...this.defaultSettings };
            this.loaded = true;
        }
    }

    /**
     * Save settings to storage
     */
    async saveSettings() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.sync.set({ [this.storageKey]: this.currentSettings });
                logger?.debug('Settings saved to storage:', this.currentSettings);
            }
        } catch (error) {
            logger?.warn('Could not save settings to storage:', error);
        }
    }

    /**
     * Check if settings have been loaded
     * @returns {boolean} Whether settings are loaded
     */
    isLoaded() {
        return this.loaded;
    }

    /**
     * Wait for settings to be loaded
     * @returns {Promise} Promise that resolves when settings are loaded
     */
    async waitForLoad() {
        if (this.loaded) {
            return Promise.resolve();
        }
        
        return new Promise((resolve) => {
            const checkLoaded = () => {
                if (this.loaded) {
                    resolve();
                } else {
                    setTimeout(checkLoaded, 50);
                }
            };
            checkLoaded();
        });
    }

    /**
     * Get version information
     * @returns {Object} Version and configuration info
     */
    getInfo() {
        return {
            version: '1.0.0',
            storageKey: this.storageKey,
            loaded: this.loaded,
            settingsCount: Object.keys(this.currentSettings).length,
            defaultsCount: Object.keys(this.defaultSettings).length
        };
    }
}

// Create global instance
const config = new ConfigManager();

// Export for use in other modules
window.SeekerConfig = config; 