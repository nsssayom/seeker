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
        
        // Centralized platform configuration
        this.supportedPlatforms = {
            'paramountplus.com': {
                name: 'Paramount+',
                hasNativeControls: true,
                needsConflictPrevention: true,
                needsScrollPrevention: true
            },
            'hulu.com': {
                name: 'Hulu',
                hasNativeControls: true,
                needsConflictPrevention: true,
                needsScrollPrevention: false
            },
            'disneyplus.com': {
                name: 'Disney+',
                hasNativeControls: true,
                needsConflictPrevention: false,
                needsScrollPrevention: false
            },
            'max.com': {
                name: 'Max',
                hasNativeControls: true,
                needsConflictPrevention: false,
                needsScrollPrevention: false
            },
            'amazon.com': {
                name: 'Prime Video',
                hasNativeControls: true,
                needsConflictPrevention: false,
                needsScrollPrevention: false
            },
            'peacocktv.com': {
                name: 'Peacock',
                hasNativeControls: true,
                needsConflictPrevention: false,
                needsScrollPrevention: false
            },
            'appletv.com': {
                name: 'Apple TV+',
                hasNativeControls: true,
                needsConflictPrevention: false,
                needsScrollPrevention: false
            },
            'tubi.tv': {
                name: 'Tubi',
                hasNativeControls: true,
                needsConflictPrevention: false,
                needsScrollPrevention: false
            }
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
     * Get supported platform domains
     * @returns {string[]} Array of supported domain names
     */
    getSupportedDomains() {
        return Object.keys(this.supportedPlatforms);
    }

    /**
     * Get platform configuration for a domain
     * @param {string} hostname - The hostname to check
     * @returns {Object|null} Platform configuration or null if not supported
     */
    getPlatformConfig(hostname) {
        for (const domain of Object.keys(this.supportedPlatforms)) {
            if (hostname.includes(domain)) {
                return {
                    domain,
                    ...this.supportedPlatforms[domain]
                };
            }
        }
        return null;
    }

    /**
     * Check if a hostname is supported
     * @param {string} hostname - The hostname to check
     * @returns {boolean} Whether the platform is supported
     */
    isSupportedPlatform(hostname) {
        return this.getPlatformConfig(hostname) !== null;
    }

    /**
     * Get all platform configurations
     * @returns {Object} All platform configurations
     */
    getAllPlatforms() {
        return { ...this.supportedPlatforms };
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
            defaultsCount: Object.keys(this.defaultSettings).length,
            supportedPlatformsCount: Object.keys(this.supportedPlatforms).length
        };
    }
}

// Create global instance
const config = new ConfigManager();

// Export for use in other modules
window.SeekerConfig = config; 