/**
 * Main Seeker Extension Script
 * Orchestrates all components and initializes the extension
 */
class SeekerExtension {
    constructor() {
        this.playerDetector = null;
        this.mediaController = null;
        this.keyboardHandler = null;
        this.settingsOverlay = null;
        this.platformIntegration = null;
        this.isInitialized = false;
        this.retryCount = 0;
        this.maxRetries = 5;
        
        this.initialize();
    }

    /**
     * Initialize the extension
     */
    async initialize() {
        try {
            logger.info('Seeker extension initializing...');
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initializeComponents());
            } else {
                this.initializeComponents();
            }
            
        } catch (error) {
            logger.error('Failed to initialize extension:', error);
            this.scheduleRetry();
        }
    }

    /**
     * Initialize all components
     */
    async initializeComponents() {
        try {
            // First, ensure config is loaded
            await this.waitForConfig();
            
            // Initialize core components
            await this.initializeCore();
            
            // Initialize platform-specific integrations
            await this.initializePlatformIntegration();
            
            // Initialize UI components
            await this.initializeUI();
            
            // Setup global event listeners
            this.setupGlobalListeners();
            
            // Mark as initialized
            this.isInitialized = true;
            this.retryCount = 0;
            
            logger.info('Seeker extension initialized successfully');
            
            // Show initialization notification (config is already loaded)
            this.showInitializationNotification();
            
        } catch (error) {
            logger.error('Failed to initialize components:', error);
            this.scheduleRetry();
        }
    }

    /**
     * Wait for config to be loaded
     */
    async waitForConfig() {
        if (!window.SeekerConfig) {
            throw new Error('SeekerConfig not available');
        }
        
        await window.SeekerConfig.waitForLoad();
        logger.debug('Config loaded successfully');
    }

    /**
     * Initialize core components
     */
    async initializeCore() {
        // Initialize media controller
        this.mediaController = new MediaController();
        logger.debug('Media controller initialized');

        // Initialize player detector
        this.playerDetector = new PlayerDetector();
        
        // Set up player detection callback
        this.playerDetector.setPlayerChangeCallback((player) => {
            this.handlePlayerChange(player);
        });
        
        logger.debug('Player detector initialized');

        // Initialize keyboard handler
        this.keyboardHandler = new KeyboardHandler(this.mediaController);
        logger.debug('Keyboard handler initialized');
    }

    /**
     * Initialize platform-specific integration
     */
    async initializePlatformIntegration() {
        const hostname = DOMUtils.getHostname();
        logger.debug(`Initializing platform integration for hostname: ${hostname}`);
        
        // Get platform configuration from centralized config
        const platformConfig = this.config ? this.config.getPlatformConfig(hostname) : null;
        
        if (!platformConfig) {
            logger.debug(`Platform not supported yet for hostname: ${hostname}`);
            return;
        }
        
        // Support for multiple platforms using centralized config
        if (hostname.includes('paramountplus.com')) {
            this.platformIntegration = new window.ParamountPlatform();
            this.platformIntegration.initialize();
            logger.debug(`Platform integration initialized: ${this.platformIntegration.name}`);
        } else if (hostname.includes('hulu.com')) {
            logger.debug('Detected Hulu platform, initializing...');
            this.platformIntegration = new window.HuluPlatform();
            this.platformIntegration.initialize();
            logger.debug(`Platform integration initialized: ${this.platformIntegration.name}`);
        } else {
            logger.debug(`Platform integration not yet implemented for: ${platformConfig.name}`);
        }
    }

    /**
     * Initialize UI components
     */
    async initializeUI() {
        // Settings overlay is already initialized via its own file
        if (window.SettingsOverlay) {
            this.settingsOverlay = new window.SettingsOverlay(
                this.mediaController, 
                this.keyboardHandler
            );
            logger.debug('Settings overlay initialized');
        }

        // Initialize notification system from config (config is already loaded)
        if (window.SeekerNotification) {
            await window.SeekerNotification.initializeFromConfig();
            logger.debug('Notification system initialized');
        }
    }

    /**
     * Setup global event listeners
     */
    setupGlobalListeners() {
        // Listen for page navigation changes
        let currentUrl = window.location.href;
        const checkUrlChange = () => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                logger.debug('URL changed, reinitializing...');
                setTimeout(() => this.reinitialize(), 1000);
            }
        };
        
        setInterval(checkUrlChange, 2000);

        // Listen for visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // Page became visible, check if we need to reinitialize
                setTimeout(() => {
                    if (!this.playerDetector.hasActivePlayer()) {
                        this.playerDetector.detectPlayer();
                    }
                }, 500);
            }
        });

        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => {
            if (this.platformIntegration && 
                typeof this.platformIntegration.handleFullscreenChange === 'function') {
                this.platformIntegration.handleFullscreenChange();
            }
        });

        // Listen for window focus/blur
        window.addEventListener('focus', () => {
            if (this.keyboardHandler) {
                this.keyboardHandler.enable();
            }
        });

        window.addEventListener('blur', () => {
            // Keep keyboard handler enabled even when window loses focus
            // This allows controls to work in fullscreen mode
        });

        // Listen for storage changes (settings updates from popup)
        if (chrome.storage) {
            chrome.storage.onChanged.addListener((changes, areaName) => {
                if (areaName === 'sync' && changes.seekerSettings) {
                    this.handleSettingsChange(changes.seekerSettings.newValue);
                }
            });
        }
    }

    /**
     * Handle player change
     * @param {Object} player - Player object from PlayerDetector
     */
    handlePlayerChange(player) {
        logger.info('Player changed:', player ? player.platform : 'No player');
        
        if (player) {
            // Set player in media controller
            this.mediaController.setPlayer(player);
            
            // Enable keyboard handler
            this.keyboardHandler.enable();
            
            // Notify user (respect notification settings, wait for config)
            this.showPlayerDetectedNotification(player.platform);
        } else {
            // No player available
            this.mediaController.setPlayer(null);
            
            // Keep keyboard handler enabled for when player appears
            // this.keyboardHandler.disable();
        }
    }

    /**
     * Handle settings change
     * @param {Object} newSettings - New settings
     */
    handleSettingsChange(newSettings) {
        if (newSettings && this.mediaController) {
            this.mediaController.updateSettings(newSettings);
            logger.debug('Settings updated from storage:', newSettings);
            
            // Update notification system
            if (newSettings.enableNotifications) {
                window.SeekerNotification.enable();
            } else {
                window.SeekerNotification.disable();
            }
        }
    }

    /**
     * Show initialization notification (config is already loaded)
     */
    showInitializationNotification() {
        // Config is guaranteed to be loaded at this point
        if (window.SeekerNotification && window.SeekerConfig.get('enableNotifications', true)) {
            window.SeekerNotification.showInfo(
                'Seeker Active', 
                'Keyboard controls enabled'
            );
        }
    }

    /**
     * Show player detected notification after ensuring config is loaded
     */
    showPlayerDetectedNotification(platform) {
        // Config is guaranteed to be loaded at this point
        if (window.SeekerNotification && window.SeekerConfig.get('enableNotifications', true)) {
            window.SeekerNotification.showInfo(
                'Player Detected',
                `Connected to ${platform}`
            );
        }
    }

    /**
     * Schedule retry for initialization
     */
    scheduleRetry() {
        if (this.retryCount >= this.maxRetries) {
            logger.error('Max retries reached, giving up initialization');
            return;
        }
        
        this.retryCount++;
        const delay = Math.min(1000 * Math.pow(2, this.retryCount), 10000); // Exponential backoff
        
        logger.warn(`Retrying initialization in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`);
        
        setTimeout(() => {
            this.initializeComponents();
        }, delay);
    }

    /**
     * Reinitialize the extension (for page changes)
     */
    async reinitialize() {
        try {
            logger.debug('Reinitializing extension...');
            
            // Clean up existing components
            this.cleanup();
            
            // Reinitialize after a short delay
            setTimeout(() => {
                this.initializeComponents();
            }, 500);
            
        } catch (error) {
            logger.error('Failed to reinitialize:', error);
        }
    }

    /**
     * Get extension status
     * @returns {Object} Status information
     */
    getStatus() {
        const currentPlayer = this.mediaController ? this.mediaController.getCurrentPlayer() : null;
        const platform = this.platformIntegration ? this.platformIntegration.name : 'Unknown';
        
        // Get current config values
        const config = window.SeekerConfig;
        const notificationsEnabled = config ? config.get('enableNotifications', true) : true;
        const volumeControlEnabled = config ? config.get('enableVolumeControl', true) : true;
        const playbackControlEnabled = config ? config.get('enablePlaybackControl', true) : true;
        
        return {
            initialized: this.isInitialized,
            platform: platform,
            keyboardEnabled: this.keyboardHandler ? this.keyboardHandler.isKeyboardEnabled() : false,
            notificationsEnabled: notificationsEnabled,
            volumeControlEnabled: volumeControlEnabled,
            playbackControlEnabled: playbackControlEnabled,
            player: {
                connected: !!currentPlayer
            },
            features: this.platformIntegration ? this.platformIntegration.getFeatures() : {},
            version: '1.0.0'
        };
    }

    /**
     * Show settings overlay
     */
    showSettings() {
        if (this.settingsOverlay) {
            this.settingsOverlay.show();
            logger.debug('Settings overlay shown via popup');
        } else {
            logger.warn('Settings overlay not available');
        }
    }

    /**
     * Set extension enabled/disabled state
     */
    setEnabled(enabled) {
        if (this.keyboardHandler) {
            this.keyboardHandler.setEnabled(enabled);
            logger.debug(`Extension ${enabled ? 'enabled' : 'disabled'} via popup`);
        } else {
            logger.warn('Keyboard handler not available for setEnabled');
        }
    }

    /**
     * Toggle notifications enabled/disabled
     */
    async toggleNotifications(enabled) {
        try {
            // Update config first
            if (window.SeekerConfig) {
                window.SeekerConfig.set('enableNotifications', enabled);
                await window.SeekerConfig.saveSettings();
            }

            // Update notification system
            if (window.SeekerNotification) {
                if (enabled) {
                    window.SeekerNotification.enable();
                } else {
                    window.SeekerNotification.disable();
                }
            }

            // Update media controller if available
            if (this.mediaController) {
                this.mediaController.updateSettings({ enableNotifications: enabled });
            }

            logger.debug(`Notifications ${enabled ? 'enabled' : 'disabled'} via popup`);
        } catch (error) {
            logger.error('Failed to toggle notifications:', error);
        }
    }

    /**
     * Toggle volume control enabled/disabled
     */
    async toggleVolumeControl(enabled) {
        try {
            // Update config first
            if (window.SeekerConfig) {
                window.SeekerConfig.set('enableVolumeControl', enabled);
                await window.SeekerConfig.saveSettings();
            }

            // Update media controller if available
            if (this.mediaController) {
                this.mediaController.updateSettings({ enableVolumeControl: enabled });
            }

            logger.debug(`Volume control ${enabled ? 'enabled' : 'disabled'} via popup`);
        } catch (error) {
            logger.error('Failed to toggle volume control:', error);
        }
    }

    /**
     * Toggle playback control enabled/disabled
     */
    async togglePlaybackControl(enabled) {
        try {
            // Update config first
            if (window.SeekerConfig) {
                window.SeekerConfig.set('enablePlaybackControl', enabled);
                await window.SeekerConfig.saveSettings();
            }

            // Update media controller if available
            if (this.mediaController) {
                this.mediaController.updateSettings({ enablePlaybackControl: enabled });
            }

            logger.debug(`Playback control ${enabled ? 'enabled' : 'disabled'} via popup`);
        } catch (error) {
            logger.error('Failed to toggle playback control:', error);
        }
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.playerDetector) {
            this.playerDetector.destroy();
        }
        
        if (this.platformIntegration) {
            this.platformIntegration.cleanup();
        }
        
        // Don't destroy UI components as they might be reused
        
        this.isInitialized = false;
        logger.debug('Extension cleaned up');
    }

    /**
     * Destroy extension completely
     */
    destroy() {
        this.cleanup();
        
        if (this.settingsOverlay) {
            this.settingsOverlay.destroy();
        }
        
        if (window.SeekerNotification) {
            window.SeekerNotification.destroy();
        }
        
        logger.info('Extension destroyed');
    }
}

// Initialize extension when script loads
let seekerExtension;

try {
    seekerExtension = new SeekerExtension();
    logger.info('SeekerExtension initialized successfully');
} catch (error) {
    logger.error('Failed to initialize SeekerExtension:', error);
}

// Always make functions available globally, even if extension failed to initialize
window.SeekerExtension = seekerExtension;

// Export status function for popup communication with fallback
window.getSeekerStatus = () => {
    if (seekerExtension) {
        return seekerExtension.getStatus();
    }
    
    // Fallback status when extension is not initialized
    const hostname = DOMUtils.getHostname();
    return {
        initialized: false,
        platform: hostname.includes('hulu.com') ? 'Hulu' : 
                 hostname.includes('paramountplus.com') ? 'Paramount+' : 'Unknown',
        keyboardEnabled: false,
        notificationsEnabled: false,
        player: { connected: false },
        features: {},
        version: '1.0.0',
        error: 'Extension not fully initialized'
    };
};

window.showSeekerSettings = () => {
    if (seekerExtension) {
        return seekerExtension.showSettings();
    }
    console.warn('SeekerExtension not available for settings');
};

window.setSeekerEnabled = (enabled) => {
    if (seekerExtension) {
        return seekerExtension.setEnabled(enabled);
    }
    console.warn('SeekerExtension not available for enable/disable');
};

window.toggleSeekerNotifications = (enabled) => {
    if (seekerExtension) {
        return seekerExtension.toggleNotifications(enabled);
    }
    console.warn('SeekerExtension not available for notifications toggle');
};

window.toggleSeekerVolumeControl = (enabled) => {
    if (seekerExtension) {
        return seekerExtension.toggleVolumeControl(enabled);
    }
    console.warn('SeekerExtension not available for volume control toggle');
};

window.toggleSeekerPlaybackControl = (enabled) => {
    if (seekerExtension) {
        return seekerExtension.togglePlaybackControl(enabled);
    }
    console.warn('SeekerExtension not available for playback control toggle');
};

// Add initialization status check
window.isSeekerReady = () => {
    return !!seekerExtension && seekerExtension.isInitialized;
};
