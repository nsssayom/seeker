/**
 * Popup Script
 * Handles popup interface and communication with content scripts
 */

class SeekerPopup {
    constructor() {
        this.isInitialized = false;
        this.currentTab = null;
        this.status = null;
        
        this.initialize();
    }

    /**
     * Initialize popup
     */
    async initialize() {
        try {
            // Get current tab
            await this.getCurrentTab();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial status
            await this.loadStatus();
            
            // Update UI
            this.updateUI();
            
            this.isInitialized = true;
            console.log('Popup initialized');
            
        } catch (error) {
            console.error('Failed to initialize popup:', error);
            this.showError('Failed to connect to Seeker');
        }
    }

    /**
     * Get current active tab
     */
    async getCurrentTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            this.currentTab = tab;
        } catch (error) {
            console.error('Failed to get current tab:', error);
            throw error;
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Toggle extension button
        const toggleBtn = document.getElementById('toggle-extension');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleExtension());
        }

        // Settings button
        const settingsBtn = document.getElementById('open-settings');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettings());
        }

        // Notifications toggle (clickable)
        const notificationsStatus = document.getElementById('notifications-status');
        if (notificationsStatus) {
            notificationsStatus.addEventListener('click', () => this.toggleNotifications());
        }

        // Help link
        const helpLink = document.getElementById('help-link');
        if (helpLink) {
            helpLink.addEventListener('click', () => this.openHelp());
        }

        // Feedback link
        const feedbackLink = document.getElementById('feedback-link');
        if (feedbackLink) {
            feedbackLink.addEventListener('click', () => this.openFeedback());
        }

        // Refresh status periodically
        setInterval(() => {
            if (this.isInitialized) {
                this.loadStatus();
            }
        }, 3000);
    }

    /**
     * Load status from content script
     */
    async loadStatus() {
        try {
            if (!this.currentTab) {
                console.warn('No current tab available');
                return;
            }

            console.log('Attempting to load status from tab:', this.currentTab.id);

            // Execute script to get status
            const results = await chrome.scripting.executeScript({
                target: { tabId: this.currentTab.id },
                func: () => {
                    // Check if Seeker is available
                    console.log('Popup checking for Seeker...', {
                        getSeekerStatus: typeof window.getSeekerStatus,
                        SeekerExtension: typeof window.SeekerExtension,
                        location: window.location.href
                    });
                    
                    if (typeof window.getSeekerStatus === 'function') {
                        const status = window.getSeekerStatus();
                        console.log('Seeker status:', status);
                        return status;
                    }
                    
                    console.log('Seeker not available');
                    return null;
                }
            });

            console.log('Script execution results:', results);

            if (results && results[0] && results[0].result) {
                this.status = results[0].result;
                console.log('Status loaded successfully:', this.status);
            } else {
                console.warn('No valid status returned, checking URL...');
                
                // Check if we're on a supported domain
                const url = this.currentTab.url;
                const supportedDomains = [
                    'paramountplus.com', 'hulu.com', 'disneyplus.com', 
                    'amazon.com', 'hbomax.com', 'max.com', 
                    'peacocktv.com', 'appletv.com', 'tubi.tv'
                ];
                
                const isSupported = supportedDomains.some(domain => url.includes(domain));
                
                this.status = {
                    initialized: false,
                    platform: isSupported ? 'Loading...' : 'Unsupported site',
                    keyboardEnabled: false,
                    notificationsEnabled: false,
                    player: { connected: false },
                    features: {},
                    version: '1.0.0'
                };
            }

            this.updateUI();

        } catch (error) {
            console.warn('Could not load status:', error);
            this.status = null;
            this.updateUI();
        }
    }

    /**
     * Update UI based on current status
     */
    updateUI() {
        this.updateStatusIndicator();
        this.updatePlatformInfo();
        this.updatePlayerInfo();
        this.updateToggleButton();
        this.updatePlatformShortcuts();
    }

    /**
     * Update status indicator
     */
    updateStatusIndicator() {
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');

        if (!this.status) {
            statusDot.className = 'status-dot';
            statusText.textContent = 'Not available';
            return;
        }

        if (this.status.platform === 'Unsupported site') {
            statusDot.className = 'status-dot';
            statusText.textContent = 'Unsupported site';
        } else if (this.status.platform === 'Loading...') {
            statusDot.className = 'status-dot';
            statusText.textContent = 'Loading...';
        } else if (this.status.initialized && this.status.player.connected) {
            statusDot.className = 'status-dot connected';
            statusText.textContent = 'Connected';
        } else if (this.status.initialized) {
            statusDot.className = 'status-dot disabled';
            statusText.textContent = 'No player detected';
        } else {
            statusDot.className = 'status-dot';
            statusText.textContent = 'Not initialized';
        }
    }

    /**
     * Update platform information
     */
    updatePlatformInfo() {
        const platformName = document.getElementById('platform-name');

        if (this.status && this.status.platform) {
            platformName.textContent = this.status.platform;
        } else {
            platformName.textContent = 'Unknown Platform';
        }
    }

    /**
     * Update player information
     */
    updatePlayerInfo() {
        const playerStatus = document.getElementById('player-status');
        const keyboardStatus = document.getElementById('keyboard-status');
        const notificationsStatus = document.getElementById('notifications-status');

        if (!this.status) {
            playerStatus.textContent = 'Not available';
            playerStatus.className = 'info-value disabled';
            
            keyboardStatus.textContent = 'Not available';
            keyboardStatus.className = 'info-value disabled';
            
            notificationsStatus.textContent = 'Not available';
            notificationsStatus.className = 'info-value disabled';
            return;
        }

        // Player status
        if (this.status.player.connected) {
            playerStatus.textContent = 'Connected';
            playerStatus.className = 'info-value connected';
        } else {
            playerStatus.textContent = 'Not connected';
            playerStatus.className = 'info-value disabled';
        }

        // Keyboard status
        if (this.status.keyboardEnabled) {
            keyboardStatus.textContent = 'Enabled';
            keyboardStatus.className = 'info-value enabled';
        } else {
            keyboardStatus.textContent = 'Disabled';
            keyboardStatus.className = 'info-value disabled';
        }

        // Notifications status
        if (this.status.notificationsEnabled) {
            notificationsStatus.textContent = 'Enabled';
            notificationsStatus.className = 'info-value enabled clickable';
        } else {
            notificationsStatus.textContent = 'Disabled';
            notificationsStatus.className = 'info-value disabled clickable';
        }
    }

    /**
     * Update toggle button
     */
    updateToggleButton() {
        const toggleBtn = document.getElementById('toggle-extension');
        const toggleText = document.getElementById('toggle-text');

        if (!this.status || this.status.platform === 'Unsupported site') {
            toggleBtn.className = 'control-btn disabled';
            toggleText.textContent = 'Not Available';
            toggleBtn.disabled = true;
            return;
        }

        if (this.status.platform === 'Loading...') {
            toggleBtn.className = 'control-btn disabled';
            toggleText.textContent = 'Loading...';
            toggleBtn.disabled = true;
            return;
        }

        toggleBtn.disabled = false;

        if (this.status.keyboardEnabled) {
            toggleBtn.className = 'control-btn active';
            toggleText.textContent = 'Disable';
        } else {
            toggleBtn.className = 'control-btn';
            toggleText.textContent = 'Enable';
        }
    }

    /**
     * Toggle notifications enabled/disabled
     */
    async toggleNotifications() {
        try {
            if (!this.currentTab || !this.status) return;

            const newState = !this.status.notificationsEnabled;

            await chrome.scripting.executeScript({
                target: { tabId: this.currentTab.id },
                func: (enabled) => {
                    if (typeof window.toggleSeekerNotifications === 'function') {
                        window.toggleSeekerNotifications(enabled);
                    }
                },
                args: [newState]
            });

            // Update status immediately
            this.status.notificationsEnabled = newState;
            this.updatePlayerInfo();

            // Reload status after short delay
            setTimeout(() => {
                this.loadStatus();
            }, 500);

        } catch (error) {
            console.error('Failed to toggle notifications:', error);
            this.showError('Failed to toggle notifications');
        }
    }

    /**
     * Update platform-specific shortcuts
     */
    updatePlatformShortcuts() {
        const nextEpisodeShortcut = document.getElementById('next-episode-shortcut');
        const skipIntroShortcut = document.getElementById('skip-intro-shortcut');

        if (!nextEpisodeShortcut || !skipIntroShortcut) return;

        if (this.status && this.status.features) {
            // Show next episode shortcut if available
            if (this.status.features.nextEpisode) {
                nextEpisodeShortcut.style.display = 'flex';
            } else {
                nextEpisodeShortcut.style.display = 'none';
            }

            // Show skip intro shortcut if available
            if (this.status.features.skipIntro) {
                skipIntroShortcut.style.display = 'flex';
            } else {
                skipIntroShortcut.style.display = 'none';
            }
        } else {
            // Hide platform-specific shortcuts if no status
            nextEpisodeShortcut.style.display = 'none';
            skipIntroShortcut.style.display = 'none';
        }
    }

    /**
     * Toggle extension enabled/disabled
     */
    async toggleExtension() {
        try {
            if (!this.currentTab || !this.status) return;

            const newState = !this.status.keyboardEnabled;

            await chrome.scripting.executeScript({
                target: { tabId: this.currentTab.id },
                func: (enabled) => {
                    if (typeof window.setSeekerEnabled === 'function') {
                        window.setSeekerEnabled(enabled);
                    }
                },
                args: [newState]
            });

            // Reload status after short delay
            setTimeout(() => {
                this.loadStatus();
            }, 500);

        } catch (error) {
            console.error('Failed to toggle extension:', error);
            this.showError('Failed to toggle extension');
        }
    }

    /**
     * Open settings overlay
     */
    async openSettings() {
        try {
            if (!this.currentTab) return;

            await chrome.scripting.executeScript({
                target: { tabId: this.currentTab.id },
                func: () => {
                    if (typeof window.showSeekerSettings === 'function') {
                        window.showSeekerSettings();
                    }
                }
            });

            // Close popup
            window.close();

        } catch (error) {
            console.error('Failed to open settings:', error);
            this.showError('Failed to open settings');
        }
    }

    /**
     * Open help page
     */
    openHelp() {
        chrome.tabs.create({
            url: 'https://github.com/nsssayom/seeker#readme'
        });
    }

    /**
     * Open feedback page
     */
    openFeedback() {
        chrome.tabs.create({
            url: 'https://github.com/nsssayom/seeker/issues'
        });
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        const statusText = document.getElementById('status-text');
        if (statusText) {
            statusText.textContent = message;
            statusText.className = 'status-text error';
        }
    }

    /**
     * Check if current page is supported
     * @returns {boolean} Whether page is supported
     */
    isSupportedPage() {
        if (!this.currentTab || !this.currentTab.url) return false;

        const supportedDomains = [
            'paramountplus.com',
            'hulu.com',
            'disneyplus.com',
            'amazon.com',
            'hbomax.com',
            'max.com',
            'peacocktv.com',
            'appletv.com',
            'tubi.tv'
        ];

        return supportedDomains.some(domain => 
            this.currentTab.url.includes(domain)
        );
    }

    /**
     * Show platform support message
     */
    showPlatformSupport() {
        const platformInfo = document.getElementById('platform-info');
        if (!this.isSupportedPage()) {
            platformInfo.innerHTML = `
                <span style="color: #dc3545;">
                    This page is not officially supported. 
                    Generic controls may be available.
                </span>
            `;
        }
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SeekerPopup();
});
