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
            
            // Show initialization notification
            if (window.SeekerNotification) {
                window.SeekerNotification.showInfo(
                    'Seeker Active', 
                    'Keyboard controls enabled'
                );
            }
            
        } catch (error) {
            logger.error('Failed to initialize components:', error);
            this.scheduleRetry();
        }
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
        
        // Currently only supports Paramount+
        if (hostname.includes('paramountplus.com')) {
            this.platformIntegration = new window.ParamountPlatform();
            this.platformIntegration.initialize();
            logger.debug(`Platform integration initialized: ${this.platformIntegration.name}`);
        } else {
            logger.debug('Platform not supported yet');
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

        // Notification system is already initialized via its own file
        if (window.SeekerNotification) {
            logger.debug('Notification system available');
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
            
            // Notify user
            if (window.SeekerNotification) {
                window.SeekerNotification.showInfo(
                    'Player Detected',
                    `Connected to ${player.platform}`
                );
            }
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
        
        return {
            initialized: this.isInitialized,
            platform: platform,
            keyboardEnabled: this.keyboardHandler ? this.keyboardHandler.isKeyboardEnabled() : false,
            notificationsEnabled: window.SeekerNotification ? window.SeekerNotification.isNotificationsEnabled() : false,
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
    toggleNotifications(enabled) {
        if (window.SeekerNotification) {
            if (enabled) {
                window.SeekerNotification.enable();
            } else {
                window.SeekerNotification.disable();
            }
            logger.debug(`Notifications ${enabled ? 'enabled' : 'disabled'} via popup`);
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
const seekerExtension = new SeekerExtension();

// Make extension available globally for debugging
window.SeekerExtension = seekerExtension;

// Export status function for popup communication
window.getSeekerStatus = () => seekerExtension.getStatus();
window.showSeekerSettings = () => seekerExtension.showSettings();
window.setSeekerEnabled = (enabled) => seekerExtension.setEnabled(enabled);
window.toggleSeekerNotifications = (enabled) => seekerExtension.toggleNotifications(enabled);
