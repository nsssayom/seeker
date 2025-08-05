/**
 * Settings Overlay
 * Provides in-page settings interface for the extension
 */
class SettingsOverlay {
    constructor(mediaController, keyboardHandler) {
        this.mediaController = mediaController;
        this.keyboardHandler = keyboardHandler;
        this.config = window.SeekerConfig;
        this.overlay = null;
        this.isVisible = false;
        this.platformUpdateInterval = null;
        
        // Ensure dependencies are available
        if (!this.mediaController) {
            logger.error('SettingsOverlay: mediaController is required');
            return;
        }
        
        if (!this.keyboardHandler) {
            logger.error('SettingsOverlay: keyboardHandler is required');
            return;
        }
        
        this.createOverlay();
        this.setupStyles();
        this.setupEventListeners();
        this.initializeSettings();
    }

    /**
     * Create settings overlay
     */
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'seeker-settings-overlay';
        this.overlay.className = 'seeker-settings-overlay';
        this.overlay.innerHTML = this.getOverlayHTML();
        
        document.body.appendChild(this.overlay);
    }

    /**
     * Get overlay HTML structure
     * @returns {string} HTML string
     */
    getOverlayHTML() {
        return `
            <div class="seeker-settings-backdrop"></div>
            <div class="seeker-settings-panel">
                <div class="seeker-settings-header">
                    <h2>Seeker Settings</h2>
                    <button class="seeker-settings-close" aria-label="Close settings">
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>
                
                <div class="seeker-settings-content">
                    <div class="seeker-settings-section">
                        <h3>Seeking</h3>
                        <div class="seeker-setting-row">
                            <label for="seek-amount">Seek Amount (seconds)</label>
                            <input type="number" id="seek-amount" min="1" max="60" value="5">
                        </div>
                        <div class="seeker-setting-row">
                            <label>
                                <input type="checkbox" id="enable-notifications"> 
                                Show notifications
                            </label>
                        </div>
                        <div class="seeker-setting-row">
                            <label>
                                <input type="checkbox" id="enable-seek-preview"> 
                                Show seek preview
                            </label>
                        </div>
                    </div>
                    
                    <div class="seeker-settings-section">
                        <h3>Volume Control</h3>
                        <div class="seeker-setting-row">
                            <label for="volume-step">Volume Step (%)</label>
                            <input type="number" id="volume-step" min="1" max="50" value="10">
                        </div>
                        <div class="seeker-setting-row">
                            <label>
                                <input type="checkbox" id="enable-volume-control"> 
                                Enable volume control
                            </label>
                        </div>
                    </div>
                    
                    <div class="seeker-settings-section">
                        <h3>Playback Control</h3>
                        <div class="seeker-setting-row">
                            <label>
                                <input type="checkbox" id="enable-playback-control"> 
                                Enable play/pause control
                            </label>
                        </div>
                    </div>
                    
                    <div class="seeker-settings-section">
                        <h3>Keyboard Shortcuts</h3>
                        <div class="seeker-shortcuts-list">
                            <div class="seeker-shortcut-item">
                                <span class="shortcut-key">←/→</span>
                                <span class="shortcut-desc" id="arrow-seek-desc">Seek backward/forward</span>
                            </div>
                            <div class="seeker-shortcut-item">
                                <span class="shortcut-key">Space</span>
                                <span class="shortcut-desc">Play/Pause</span>
                            </div>
                            <div class="seeker-shortcut-item">
                                <span class="shortcut-key">K</span>
                                <span class="shortcut-desc">Play/Pause</span>
                            </div>
                            <div class="seeker-shortcut-item">
                                <span class="shortcut-key">↑/↓</span>
                                <span class="shortcut-desc" id="volume-step-desc">Volume up/down</span>
                            </div>
                            <div class="seeker-shortcut-item">
                                <span class="shortcut-key">M</span>
                                <span class="shortcut-desc">Mute/Unmute</span>
                            </div>
                            <div class="seeker-shortcut-item">
                                <span class="shortcut-key">F</span>
                                <span class="shortcut-desc">Fullscreen</span>
                            </div>
                            <div class="seeker-shortcut-item">
                                <span class="shortcut-key">C</span>
                                <span class="shortcut-desc">Toggle captions</span>
                            </div>
                            <div class="seeker-shortcut-item">
                                <span class="shortcut-key">J/L</span>
                                <span class="shortcut-desc" id="extended-seek-desc">Fast seek backward/forward</span>
                            </div>
                            <div class="seeker-shortcut-item" id="next-episode-shortcut" style="display: none;">
                                <span class="shortcut-key">N</span>
                                <span class="shortcut-desc">Next episode (when available)</span>
                            </div>
                            <div class="seeker-shortcut-item" id="skip-intro-shortcut" style="display: none;">
                                <span class="shortcut-key">S</span>
                                <span class="shortcut-desc">Skip intro (when available)</span>
                            </div>
                            <div class="seeker-shortcut-item">
                                <span class="shortcut-key">0-9</span>
                                <span class="shortcut-desc">Seek to percentage</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="seeker-settings-section">
                        <h3>About</h3>
                        <div class="seeker-about-info">
                            <p><strong>Seeker - Universal Media Controls</strong></p>
                            <p>Version 1.0.0</p>
                            <p>Adds keyboard-based seeking and media controls to streaming platforms.</p>
                            <div class="seeker-platform-status">
                                <span id="current-platform">Platform: Loading...</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="seeker-settings-footer">
                    <button class="seeker-btn seeker-btn-secondary" id="reset-settings">Reset to Defaults</button>
                    <button class="seeker-btn seeker-btn-primary" id="save-settings">Save Changes</button>
                </div>
            </div>
        `;
    }

    /**
     * Setup overlay styles
     */
    setupStyles() {
        const styles = `
            .seeker-settings-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1000000;
                display: none;
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .seeker-settings-overlay.show {
                display: flex;
                animation: fadeIn 0.3s ease-out;
            }
            
            .seeker-settings-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(4px);
            }
            
            .seeker-settings-panel {
                position: relative;
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow: hidden;
                animation: slideIn 0.3s ease-out;
            }
            
            .seeker-settings-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 20px 24px;
                border-bottom: 1px solid #e5e5e5;
                background: #f8f9fa;
            }
            
            .seeker-settings-header h2 {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
                color: #1a1a1a;
            }
            
            .seeker-settings-close {
                background: none;
                border: none;
                padding: 8px;
                border-radius: 6px;
                cursor: pointer;
                color: #666;
                transition: all 0.2s ease;
            }
            
            .seeker-settings-close:hover {
                background: #e5e5e5;
                color: #1a1a1a;
            }
            
            .seeker-settings-content {
                padding: 24px;
                max-height: 60vh;
                overflow-y: auto;
            }
            
            .seeker-settings-section {
                margin-bottom: 32px;
            }
            
            .seeker-settings-section:last-child {
                margin-bottom: 0;
            }
            
            .seeker-settings-section h3 {
                margin: 0 0 16px 0;
                font-size: 16px;
                font-weight: 600;
                color: #1a1a1a;
                border-bottom: 2px solid #007AFF;
                padding-bottom: 8px;
            }
            
            .seeker-setting-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 16px;
                padding: 8px 0;
            }
            
            .seeker-setting-row label {
                font-size: 14px;
                color: #333;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .seeker-setting-row input[type="number"] {
                width: 80px;
                padding: 6px 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
            }
            
            .seeker-setting-row input[type="checkbox"] {
                margin: 0;
            }
            
            .seeker-shortcuts-list {
                display: grid;
                gap: 8px;
            }
            
            .seeker-shortcut-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: #f8f9fa;
                border-radius: 6px;
                border: 1px solid #e5e5e5;
            }
            
            .shortcut-key {
                font-family: 'Monaco', 'Consolas', monospace;
                background: #333;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 600;
            }
            
            .shortcut-desc {
                font-size: 14px;
                color: #666;
            }
            
            .seeker-about-info {
                font-size: 14px;
                line-height: 1.5;
                color: #666;
            }
            
            .seeker-about-info p {
                margin: 0 0 8px 0;
            }
            
            .seeker-platform-status {
                margin-top: 16px;
                padding: 12px;
                background: #f0f9ff;
                border: 1px solid #bae6fd;
                border-radius: 6px;
                font-family: monospace;
                font-size: 13px;
            }
            
            .seeker-settings-footer {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                padding: 20px 24px;
                border-top: 1px solid #e5e5e5;
                background: #f8f9fa;
            }
            
            .seeker-btn {
                padding: 10px 20px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                border: none;
            }
            
            .seeker-btn-primary {
                background: #007AFF;
                color: white;
            }
            
            .seeker-btn-primary:hover {
                background: #0056CC;
            }
            
            .seeker-btn-secondary {
                background: transparent;
                color: #666;
                border: 1px solid #ddd;
            }
            
            .seeker-btn-secondary:hover {
                background: #f5f5f5;
                color: #333;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideIn {
                from { 
                    opacity: 0;
                    transform: scale(0.9) translateY(-20px); 
                }
                to { 
                    opacity: 1;
                    transform: scale(1) translateY(0); 
                }
            }
            
            @media (max-width: 640px) {
                .seeker-settings-panel {
                    width: 95%;
                    max-height: 90vh;
                }
                
                .seeker-settings-header,
                .seeker-settings-content,
                .seeker-settings-footer {
                    padding: 16px;
                }
                
                .seeker-setting-row {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 8px;
                }
                
                .seeker-shortcuts-list {
                    gap: 6px;
                }
                
                .seeker-shortcut-item {
                    padding: 6px 8px;
                }
                
                .seeker-settings-footer {
                    flex-direction: column;
                }
            }
        `;
        
        DOMUtils.addCSS(styles, 'seeker-settings-styles');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (!this.overlay) {
            logger.error('SettingsOverlay: Cannot setup event listeners - overlay not created');
            return;
        }

        // Close button
        const closeBtn = this.overlay.querySelector('.seeker-settings-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        // Backdrop click
        const backdrop = this.overlay.querySelector('.seeker-settings-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => this.hide());
        }

        // Save button
        const saveBtn = this.overlay.querySelector('#save-settings');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSettings());
        }

        // Reset button
        const resetBtn = this.overlay.querySelector('#reset-settings');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetSettings());
        }

        // Real-time updates for seek amount and volume step
        const seekAmountInput = this.overlay.querySelector('#seek-amount');
        if (seekAmountInput) {
            seekAmountInput.addEventListener('input', (event) => {
                const value = parseInt(event.target.value) || 5;
                if (this.config) {
                    this.config.set('seekAmount', value);
                }
                this.updateShortcutDescriptions();
            });
        }

        const volumeStepInput = this.overlay.querySelector('#volume-step');
        if (volumeStepInput) {
            volumeStepInput.addEventListener('input', (event) => {
                const value = (parseInt(event.target.value) || 10) / 100;
                if (this.config) {
                    this.config.set('volumeStep', value);
                }
                this.updateShortcutDescriptions();
            });
        }

        // Keyboard shortcut to open settings (Ctrl/Cmd + Shift + S)
        document.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'KeyS') {
                event.preventDefault();
                this.toggle();
            }
        });

        // Escape to close
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Escape' && this.isVisible) {
                event.preventDefault();
                this.hide();
            }
        });
    }

    /**
     * Initialize settings with config system
     */
    async initializeSettings() {
        if (this.config) {
            await this.config.waitForLoad();
            logger.debug('SettingsOverlay initialized with config');
        } else {
            logger.warn('SeekerConfig not available in SettingsOverlay');
        }
        this.updateUI();
    }

    /**
     * Update UI with current settings
     */
    updateUI() {
        if (!this.overlay) {
            logger.error('SettingsOverlay: Cannot update UI - overlay not available');
            return;
        }

        const seekAmountInput = this.overlay.querySelector('#seek-amount');
        const volumeStepInput = this.overlay.querySelector('#volume-step');
        const notificationsCheckbox = this.overlay.querySelector('#enable-notifications');
        const volumeControlCheckbox = this.overlay.querySelector('#enable-volume-control');
        const playbackControlCheckbox = this.overlay.querySelector('#enable-playback-control');
        const seekPreviewCheckbox = this.overlay.querySelector('#enable-seek-preview');
        const platformStatus = this.overlay.querySelector('#current-platform');

        if (this.config) {
            if (seekAmountInput) seekAmountInput.value = this.config.get('seekAmount', 5);
            if (volumeStepInput) volumeStepInput.value = Math.round(this.config.get('volumeStep', 0.1) * 100);
            if (notificationsCheckbox) notificationsCheckbox.checked = this.config.get('enableNotifications', true);
            if (volumeControlCheckbox) volumeControlCheckbox.checked = this.config.get('enableVolumeControl', true);
            if (playbackControlCheckbox) playbackControlCheckbox.checked = this.config.get('enablePlaybackControl', true);
            if (seekPreviewCheckbox) seekPreviewCheckbox.checked = this.config.get('enableSeekPreview', false);
        }

        // Update platform status
        if (platformStatus) {
            const currentPlayer = this.mediaController ? this.mediaController.currentPlayer : null;
            const platform = currentPlayer ? currentPlayer.platform : 'No player detected';
            platformStatus.textContent = `Platform: ${platform}`;
        }

        // Update dynamic shortcut descriptions
        this.updateShortcutDescriptions();

        // Show/hide platform-specific shortcuts
        this.updatePlatformShortcuts();
    }

    /**
     * Update dynamic shortcut descriptions based on current settings
     */
    updateShortcutDescriptions() {
        if (!this.overlay) {
            logger.warn('SettingsOverlay: Cannot update shortcut descriptions - overlay not available');
            return;
        }

        const arrowSeekDesc = this.overlay.querySelector('#arrow-seek-desc');
        const extendedSeekDesc = this.overlay.querySelector('#extended-seek-desc');
        const volumeStepDesc = this.overlay.querySelector('#volume-step-desc');

        if (this.config) {
            const seekAmounts = this.config.getSeekAmounts();
            logger.debug('Updating shortcut descriptions with config:', seekAmounts);

            if (arrowSeekDesc) {
                arrowSeekDesc.textContent = `Seek backward/forward (${seekAmounts.arrow}s)`;
                logger.debug('Updated arrow seek description');
            } else {
                logger.warn('Arrow seek description element not found');
            }

            if (extendedSeekDesc) {
                extendedSeekDesc.textContent = `Fast seek backward/forward (${seekAmounts.extended}s)`;
                logger.debug('Updated extended seek description');
            } else {
                logger.warn('Extended seek description element not found');
            }

            if (volumeStepDesc) {
                const volumePercent = Math.round(this.config.get('volumeStep', 0.1) * 100);
                volumeStepDesc.textContent = `Volume up/down (${volumePercent}%)`;
                logger.debug('Updated volume step description');
            } else {
                logger.warn('Volume step description element not found');
            }
        } else {
            // Fall back to simple descriptions if config not available
            if (arrowSeekDesc) {
                arrowSeekDesc.textContent = 'Seek backward/forward';
            }
            if (extendedSeekDesc) {
                extendedSeekDesc.textContent = 'Fast seek backward/forward';
            }
            if (volumeStepDesc) {
                volumeStepDesc.textContent = 'Volume up/down';
            }
        }
    }

    /**
     * Update platform-specific shortcuts visibility
     */
    updatePlatformShortcuts() {
        if (!this.overlay) {
            logger.warn('SettingsOverlay: Cannot update platform shortcuts - overlay not available');
            return;
        }

        const nextEpisodeShortcut = this.overlay.querySelector('#next-episode-shortcut');
        const skipIntroShortcut = this.overlay.querySelector('#skip-intro-shortcut');
        
        if (!nextEpisodeShortcut || !skipIntroShortcut) {
            logger.warn('Could not find shortcut elements in overlay');
            return;
        }

        // Check if we're on Paramount+ and if features are available
        const hostname = DOMUtils.getHostname();
        const isParamount = hostname.includes('paramountplus.com');
        
        logger.debug('Platform shortcuts update:', { hostname, isParamount });
        
        if (isParamount) {
            // Check if next episode button exists and is visible
            const nextButton = document.querySelector('.btn-next');
            const isNextAvailable = nextButton && 
                                   !nextButton.disabled && 
                                   nextButton.offsetParent !== null && 
                                   window.getComputedStyle(nextButton).display !== 'none';
            
            nextEpisodeShortcut.style.display = isNextAvailable ? 'flex' : 'none';
            
            // Check if skip intro button exists and is visible
            const skipButton = document.querySelector('.skip-button');
            const isSkipAvailable = skipButton && 
                                   !skipButton.disabled && 
                                   skipButton.offsetParent !== null && 
                                   window.getComputedStyle(skipButton).display !== 'none';
            
            skipIntroShortcut.style.display = isSkipAvailable ? 'flex' : 'none';
            
            logger.debug('Paramount shortcuts updated:', {
                nextEpisode: isNextAvailable,
                skipIntro: isSkipAvailable,
                nextButton: !!nextButton,
                skipButton: !!skipButton
            });
        } else {
            // Hide Paramount-specific shortcuts on other platforms
            nextEpisodeShortcut.style.display = 'none';
            skipIntroShortcut.style.display = 'none';
            
            logger.debug('Non-Paramount platform, hiding shortcuts');
        }
    }

    /**
     * Save settings from UI
     */
    async saveSettings() {
        try {
            const seekAmountInput = this.overlay.querySelector('#seek-amount');
            const volumeStepInput = this.overlay.querySelector('#volume-step');
            const notificationsCheckbox = this.overlay.querySelector('#enable-notifications');
            const volumeControlCheckbox = this.overlay.querySelector('#enable-volume-control');
            const playbackControlCheckbox = this.overlay.querySelector('#enable-playback-control');
            const seekPreviewCheckbox = this.overlay.querySelector('#enable-seek-preview');

            const newSettings = {
                seekAmount: parseInt(seekAmountInput.value) || 5,
                volumeStep: (parseInt(volumeStepInput.value) || 10) / 100,
                enableNotifications: notificationsCheckbox.checked,
                enableVolumeControl: volumeControlCheckbox.checked,
                enablePlaybackControl: playbackControlCheckbox.checked,
                enableSeekPreview: seekPreviewCheckbox.checked
            };

            // Update config
            if (this.config) {
                this.config.updateSettings(newSettings);
            }

            // Update media controller
            this.mediaController.updateSettings(newSettings);

            // Update notification system
            if (newSettings.enableNotifications) {
                window.SeekerNotification.enable();
            } else {
                window.SeekerNotification.disable();
            }

            window.SeekerNotification.showInfo('Settings Saved', 'Your preferences have been updated');
            
            logger.info('Settings saved:', newSettings);
            
            // Hide overlay after short delay
            setTimeout(() => {
                this.hide();
            }, 1000);
            
        } catch (error) {
            logger.error('Failed to save settings:', error);
            window.SeekerNotification.showError('Save Failed', 'Could not save settings');
        }
    }

    /**
     * Reset settings to defaults
     */
    resetSettings() {
        if (this.config) {
            this.config.resetToDefaults();
        }
        this.updateUI();
        window.SeekerNotification.showInfo('Settings Reset', 'Settings restored to defaults');
    }

    /**
     * Show overlay
     */
    show() {
        this.updateUI(); // Refresh UI with current settings
        this.overlay.classList.add('show');
        this.isVisible = true;
        
        // Focus the first input
        const firstInput = this.overlay.querySelector('input');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
        
        // Start periodic updates for platform shortcuts while overlay is visible
        this.startPlatformUpdates();
        
        logger.debug('Settings overlay shown');
    }

    /**
     * Hide overlay
     */
    hide() {
        this.overlay.classList.remove('show');
        this.isVisible = false;
        
        // Stop periodic updates
        this.stopPlatformUpdates();
        
        logger.debug('Settings overlay hidden');
    }

    /**
     * Start periodic updates for platform-specific shortcuts
     */
    startPlatformUpdates() {
        // Clear any existing interval
        this.stopPlatformUpdates();
        
        // Update immediately
        this.updatePlatformShortcuts();
        
        // Set up periodic updates every 1 second while overlay is visible
        this.platformUpdateInterval = setInterval(() => {
            if (this.isVisible) {
                this.updatePlatformShortcuts();
            } else {
                this.stopPlatformUpdates();
            }
        }, 1000);
    }

    /**
     * Stop periodic updates for platform-specific shortcuts
     */
    stopPlatformUpdates() {
        if (this.platformUpdateInterval) {
            clearInterval(this.platformUpdateInterval);
            this.platformUpdateInterval = null;
        }
    }

    /**
     * Toggle overlay visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Check if overlay is visible
     * @returns {boolean} Whether overlay is visible
     */
    isOverlayVisible() {
        return this.isVisible;
    }

    /**
     * Get current settings
     * @returns {Object} Current settings
     */
    getSettings() {
        return this.config ? this.config.getSettings() : {};
    }

    /**
     * Destroy overlay
     */
    destroy() {
        // Stop any ongoing updates
        this.stopPlatformUpdates();
        
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        
        // Remove styles
        const styles = document.getElementById('seeker-settings-styles');
        if (styles) {
            styles.remove();
        }
        
        this.isVisible = false;
        logger.debug('Settings overlay destroyed');
    }
}

// Export for use in main script
window.SettingsOverlay = SettingsOverlay;
