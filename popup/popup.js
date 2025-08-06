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

        // No quick settings toggles anymore - status display only

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

            // Try multiple times for slow-loading pages like Hulu
            let retryCount = 0;
            const maxRetries = 3;
            let results = null;

            while (retryCount < maxRetries) {
                try {
                    // Execute script to get status
                    results = await chrome.scripting.executeScript({
                        target: { tabId: this.currentTab.id },
                        func: () => {
                            // Check if Seeker is available
                            console.log('Popup checking for Seeker...', {
                                getSeekerStatus: typeof window.getSeekerStatus,
                                SeekerExtension: typeof window.SeekerExtension,
                                isSeekerReady: typeof window.isSeekerReady === 'function' ? window.isSeekerReady() : false,
                                location: window.location.href,
                                readyState: document.readyState
                            });
                            
                            if (typeof window.getSeekerStatus === 'function') {
                                const status = window.getSeekerStatus();
                                console.log('Seeker status:', status);
                                
                                // If status indicates the extension isn't fully initialized, signal for retry
                                if (status && status.error === 'Extension not fully initialized') {
                                    console.log('Extension not fully initialized, will retry...');
                                    return { loading: true, partialStatus: status };
                                }
                                
                                return status;
                            }
                            
                            // Check if the script is still loading
                            if (document.readyState !== 'complete') {
                                console.log('Page still loading, Seeker may not be ready yet');
                                return { loading: true };
                            }
                            
                            console.log('Seeker not available');
                            return null;
                        }
                    });

                    console.log(`Script execution results (attempt ${retryCount + 1}):`, results);

                    if (results && results[0] && results[0].result) {
                        if (results[0].result.loading) {
                            console.log('Content script still loading, retrying...');
                            
                            // If we have partial status, use it while retrying
                            if (results[0].result.partialStatus) {
                                this.status = results[0].result.partialStatus;
                                console.log('Using partial status while retrying:', this.status);
                            }
                            
                            retryCount++;
                            await new Promise(resolve => setTimeout(resolve, 500));
                            continue;
                        }
                        
                        this.status = results[0].result;
                        console.log('Status loaded successfully:', this.status);
                        break;
                    } else {
                        retryCount++;
                        if (retryCount < maxRetries) {
                            console.log(`No status received, retrying in 500ms... (${retryCount}/${maxRetries})`);
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                    }
                } catch (scriptError) {
                    console.error(`Script execution error (attempt ${retryCount + 1}):`, scriptError);
                    retryCount++;
                    if (retryCount < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
            }

            if (!this.status || !results || !results[0] || !results[0].result) {
                console.warn('No valid status returned after retries, checking URL...');
                
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
                
                // For supported sites, the retry mechanism above should have handled it
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
        this.updatePlatformSection();
        this.updateStatusIndicators();
        this.updateToggleButton();
        this.updatePlatformShortcuts();
    }

    /**
     * Update platform section in header
     */
    updatePlatformSection() {
        const platformIcon = document.getElementById('platform-icon');
        const platformName = document.getElementById('platform-name');

        if (!this.status || !this.status.platform) {
            platformIcon.src = '../icons/icon-32.png';
            platformIcon.alt = 'Unknown';
            platformName.textContent = 'Unknown';
            return;
        }

        const platform = this.status.platform.toLowerCase();
        
        // Set platform-specific icon and name using real platform icons
        if (platform.includes('paramount')) {
            platformIcon.src = '../icons/platforms/paramount.png';
            platformIcon.alt = 'Paramount+';
            platformName.textContent = 'Paramount+';
        } else if (platform.includes('hulu')) {
            platformIcon.src = '../icons/platforms/hulu.png';
            platformIcon.alt = 'Hulu';
            platformName.textContent = 'Hulu';
        } else if (platform.includes('max') || platform.includes('hbo')) {
            platformIcon.src = '../icons/platforms/max.png';
            platformIcon.alt = 'Max';
            platformName.textContent = 'Max';
        } else {
            platformIcon.src = '../icons/icon-32.png';
            platformIcon.alt = this.status.platform;
            platformName.textContent = this.status.platform;
        }
    }

    /**
     * Update status indicators
     */
    updateStatusIndicators() {
        const notificationsIndicator = document.getElementById('notifications-indicator');
        const keyboardIndicator = document.getElementById('keyboard-indicator');

        if (!this.status) {
            notificationsIndicator.className = 'status-indicator disabled';
            keyboardIndicator.className = 'status-indicator disabled';
            return;
        }

        // Notifications indicator
        if (this.status.notificationsEnabled) {
            notificationsIndicator.className = 'status-indicator enabled';
        } else {
            notificationsIndicator.className = 'status-indicator disabled';
        }

        // Keyboard control indicator
        if (this.status.keyboardEnabled) {
            keyboardIndicator.className = 'status-indicator enabled';
        } else {
            keyboardIndicator.className = 'status-indicator disabled';
        }
    }

    /**
     * Update toggle button
     */
    updateToggleButton() {
        const toggleBtn = document.getElementById('toggle-extension');
        const toggleText = document.getElementById('toggle-text');

        if (!this.status || this.status.platform === 'Unsupported site') {
            toggleBtn.className = 'control-button primary';
            toggleText.textContent = 'Not Available';
            toggleBtn.disabled = true;
            return;
        }

        if (this.status.platform === 'Loading...') {
            toggleBtn.className = 'control-button primary';
            toggleText.textContent = 'Loading...';
            toggleBtn.disabled = true;
            return;
        }

        toggleBtn.disabled = false;

        if (this.status.keyboardEnabled) {
            toggleBtn.className = 'control-button primary';
            toggleText.textContent = 'Disable';
        } else {
            toggleBtn.className = 'control-button primary';
            toggleText.textContent = 'Enable';
        }
    }

    // Toggle methods removed - status display only now

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

        // Get supported domains from centralized config
        // Note: In popup context, we need to create a temporary config instance
        // since we don't have access to the content script's config
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
