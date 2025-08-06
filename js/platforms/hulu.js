/**
 * Hulu Platform Integration
 * Specific handling for Hulu video player
 */
class HuluPlatform {
    constructor() {
        this.name = 'Hulu';
        this.selectors = {
            video: 'video',
            playerContainer: '.player-container, .video-player, .PlaybackControlsOverPlayer',
            controls: '.PlaybackControlsOverPlayer, .player-controls',
            seekBar: '.progress-bar, .scrubber-bar',
            playButton: '.play-pause-button, [data-testid="play-pause-click-target"]',
            volumeButton: '.volume-button, .volume-control',
            volumeSlider: '.volume-slider',
            fullscreenButton: '.fullscreen-button',
            rewindButton: '.PlaybackTouchControls__rewind, [data-testid="rewind-click-target"]',
            fastForwardButton: '.PlaybackTouchControls__forward, [data-testid="forward-click-target"]',
            timeDisplay: '.time-display, .current-time',
            skipButton: '.skip-button, [aria-label*="skip"]',
            nextEpisodeButton: '.next-episode-button, [aria-label*="next"]',
            ccButton: '.cc-button, [aria-label*="caption"]'
        };
        
        this.isInitialized = false;
        this.observers = [];
    }

    /**
     * Initialize platform-specific features
     */
    initialize() {
        if (this.isInitialized) return;
        
        logger.platform('hulu', 'Initializing Hulu integration');
        
        this.setupControlsObserver();
        this.setupSkipHandler();
        this.setupNextEpisodeHandler();
        this.enhanceSeekBar();
        this.preventPageScrollOnSpace();
        this.injectCustomStyles();
        
        this.isInitialized = true;
        logger.platform('hulu', 'Hulu integration initialized');
    }

    /**
     * Setup observer for controls visibility
     */
    setupControlsObserver() {
        const observer = new MutationObserver(() => {
            this.handleControlsVisibility();
        });

        const controls = document.querySelector(this.selectors.controls);
        if (controls) {
            observer.observe(controls, {
                attributes: true,
                attributeFilter: ['class', 'style', 'aria-hidden']
            });
            
            this.observers.push(observer);
        }

        // Also observe the main player container for dynamic changes
        const playerContainer = document.querySelector(this.selectors.playerContainer);
        if (playerContainer) {
            const containerObserver = new MutationObserver(() => {
                this.handlePlayerContainerChanges();
            });
            
            containerObserver.observe(playerContainer, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style']
            });
            
            this.observers.push(containerObserver);
        }
    }

    /**
     * Handle controls visibility changes
     */
    handleControlsVisibility() {
        const controls = document.querySelector(this.selectors.controls);
        if (!controls) return;

        const isVisible = !controls.classList.contains('hidden') && 
                         controls.style.display !== 'none' &&
                         controls.getAttribute('aria-hidden') !== 'true';
        
        logger.platform('hulu', `Controls visibility: ${isVisible}`);
    }

    /**
     * Handle player container changes (for dynamic loading)
     */
    handlePlayerContainerChanges() {
        // Check if new controls appeared
        const rewindButton = document.querySelector(this.selectors.rewindButton);
        const forwardButton = document.querySelector(this.selectors.fastForwardButton);
        
        if (rewindButton || forwardButton) {
            logger.platform('hulu', 'Hulu touch controls detected');
        }
    }

    /**
     * Setup skip button handler (for ads, intros, etc.)
     */
    setupSkipHandler() {
        const checkForSkipButton = () => {
            const skipButton = document.querySelector(this.selectors.skipButton);
            if (skipButton && !skipButton.disabled && skipButton.offsetParent !== null) {
                logger.platform('hulu', 'Skip button available');
                
                // Add keyboard shortcut for skip (S key)
                const handleSkip = (event) => {
                    if (event.code === 'KeyS' && !event.ctrlKey && !event.altKey && !event.metaKey) {
                        // Check if skip button is still visible and clickable
                        const currentSkipButton = document.querySelector(this.selectors.skipButton);
                        if (currentSkipButton && !currentSkipButton.disabled && currentSkipButton.offsetParent !== null) {
                            currentSkipButton.click();
                            logger.platform('hulu', 'Skip triggered via keyboard');
                            event.preventDefault();
                        }
                    }
                };
                
                // Remove any existing handler first
                if (this._skipHandler) {
                    document.removeEventListener('keydown', this._skipHandler);
                }
                
                document.addEventListener('keydown', handleSkip);
                this._skipHandler = handleSkip;
            }
        };

        // Check immediately and periodically
        checkForSkipButton();
        setInterval(checkForSkipButton, 2000);
    }

    /**
     * Setup next episode button handler
     */
    setupNextEpisodeHandler() {
        const observer = new MutationObserver(() => {
            const nextButton = document.querySelector(this.selectors.nextEpisodeButton);
            if (nextButton && nextButton.offsetParent !== null) {
                logger.platform('hulu', 'Next episode button available');
                
                // Add keyboard shortcut for next episode (N key)
                const handleNextEpisode = (event) => {
                    if (event.code === 'KeyN' && !event.ctrlKey && !event.altKey && !event.metaKey) {
                        const currentNextButton = document.querySelector(this.selectors.nextEpisodeButton);
                        if (currentNextButton && currentNextButton.offsetParent !== null) {
                            currentNextButton.click();
                            logger.platform('hulu', 'Next episode triggered via keyboard');
                            event.preventDefault();
                        }
                    }
                };
                
                // Remove any existing handler first
                if (this._nextEpisodeHandler) {
                    document.removeEventListener('keydown', this._nextEpisodeHandler);
                }
                
                document.addEventListener('keydown', handleNextEpisode);
                this._nextEpisodeHandler = handleNextEpisode;
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        this.observers.push(observer);
    }

    /**
     * Enhance seek bar with better interaction
     */
    enhanceSeekBar() {
        const seekBar = document.querySelector(this.selectors.seekBar);
        if (!seekBar) return;

        // Add hover effects
        seekBar.addEventListener('mouseenter', () => {
            logger.platform('hulu', 'Seek bar hover detected');
        });

        // Improve click accuracy
        seekBar.addEventListener('click', (event) => {
            event.stopPropagation();
            logger.platform('hulu', 'Seek bar clicked');
        });
    }

    /**
     * Prevent page scroll when space is used for play/pause
     */
    preventPageScrollOnSpace() {
        // Similar to Paramount but adapted for Hulu's DOM structure
        const scrollPreventionHandler = (event) => {
            if (event.code === 'Space' || event.key === ' ') {
                const activeElement = document.activeElement;
                const isInputElement = activeElement && (
                    activeElement.tagName === 'INPUT' || 
                    activeElement.tagName === 'TEXTAREA' || 
                    activeElement.contentEditable === 'true' ||
                    activeElement.getAttribute('role') === 'textbox'
                );
                
                if (!isInputElement) {
                    // Only prevent scrolling, let everything else work normally
                    event.preventDefault();
                    
                    // Blur focused element to prevent scroll capture
                    if (activeElement && activeElement !== document.body && 
                        typeof activeElement.blur === 'function') {
                        activeElement.blur();
                    }
                    
                    logger.platform('hulu', 'Prevented space scroll');
                }
            }
        };

        // Only handle keypress for scroll prevention
        document.addEventListener('keypress', scrollPreventionHandler, true);
        this._spaceHandler = scrollPreventionHandler;
    }

    /**
     * Get platform-specific video element
     * @returns {HTMLVideoElement|null} Video element
     */
    getVideoElement() {
        return document.querySelector(this.selectors.video);
    }

    /**
     * Get platform-specific player container
     * @returns {Element|null} Player container element
     */
    getPlayerContainer() {
        return document.querySelector(this.selectors.playerContainer);
    }

    /**
     * Check if video is in picture-in-picture mode
     * @returns {boolean} Whether in PiP mode
     */
    isInPictureInPicture() {
        const video = this.getVideoElement();
        return video && document.pictureInPictureElement === video;
    }

    /**
     * Get current playback quality
     * @returns {string|null} Current quality setting
     */
    getCurrentQuality() {
        // Hulu doesn't expose quality info easily in the DOM
        // This would need deeper integration with their player API
        return null;
    }

    /**
     * Check if ads are currently playing
     * @returns {boolean} Whether ads are playing
     */
    isAdPlaying() {
        // Look for common ad indicators in Hulu
        const adContainers = [
            '.ad-container',
            '.advertisement',
            '[data-testid*="ad"]',
            '[class*="ad-"]'
        ];
        
        for (const selector of adContainers) {
            const adElement = document.querySelector(selector);
            if (adElement && adElement.offsetParent !== null) {
                return true;
            }
        }
        
        // Check video element for ad-related attributes
        const video = this.getVideoElement();
        if (video) {
            const currentSrc = video.currentSrc || video.src;
            if (currentSrc && currentSrc.includes('ad')) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Get current subtitle/caption language
     * @returns {string|null} Current subtitle language
     */
    getCurrentSubtitleLanguage() {
        const ccButton = document.querySelector(this.selectors.ccButton);
        if (ccButton) {
            const ariaLabel = ccButton.getAttribute('aria-label');
            return ariaLabel || null;
        }
        return null;
    }

    /**
     * Get time display elements for custom formatting
     * @returns {Object} Time display elements
     */
    getTimeDisplayElements() {
        return {
            currentTime: document.querySelector('.current-time'),
            duration: document.querySelector('.duration-time')
        };
    }

    /**
     * Handle platform-specific fullscreen changes
     */
    handleFullscreenChange() {
        const playerContainer = this.getPlayerContainer();
        if (!playerContainer) return;

        if (DOMUtils.isFullscreen()) {
            logger.platform('hulu', 'Entered fullscreen mode');
            playerContainer.classList.add('seeker-fullscreen');
        } else {
            logger.platform('hulu', 'Exited fullscreen mode');
            playerContainer.classList.remove('seeker-fullscreen');
        }
    }

    /**
     * Inject custom styles for Hulu
     */
    injectCustomStyles() {
        const styles = `
            .seeker-fullscreen {
                /* Custom fullscreen styles if needed */
            }
            
            .seeker-seek-preview {
                position: absolute;
                bottom: 60px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 14px;
                pointer-events: none;
                z-index: 9999;
            }
            
            /* Enhance Hulu controls visibility for keyboard users */
            .PlaybackControlsOverPlayer:focus-within {
                opacity: 1 !important;
            }
            
            /* Improve touch control visibility */
            .PlaybackTouchControls__rewind,
            .PlaybackTouchControls__forward {
                transition: opacity 0.2s ease;
            }
            
            .PlaybackTouchControls__rewind:hover,
            .PlaybackTouchControls__forward:hover {
                opacity: 0.8;
            }
        `;
        
        DOMUtils.addCSS(styles, 'seeker-hulu-styles');
    }

    /**
     * Clean up platform-specific observers and handlers
     */
    cleanup() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
        
        // Remove skip handler if it exists
        if (this._skipHandler) {
            document.removeEventListener('keydown', this._skipHandler);
            delete this._skipHandler;
        }
        
        // Remove next episode handler if it exists
        if (this._nextEpisodeHandler) {
            document.removeEventListener('keydown', this._nextEpisodeHandler);
            delete this._nextEpisodeHandler;
        }
        
        // Remove space handler if it exists
        if (this._spaceHandler) {
            document.removeEventListener('keypress', this._spaceHandler);
            delete this._spaceHandler;
        }
        
        this.isInitialized = false;
        logger.platform('hulu', 'Hulu integration cleaned up');
    }

    /**
     * Get platform-specific features
     * @returns {Object} Available features
     */
    getFeatures() {
        return {
            skipAds: !!document.querySelector(this.selectors.skipButton),
            nextEpisode: !!document.querySelector(this.selectors.nextEpisodeButton),
            rewind: !!document.querySelector(this.selectors.rewindButton),
            fastForward: !!document.querySelector(this.selectors.fastForwardButton),
            closedCaptions: !!document.querySelector(this.selectors.ccButton),
            volumeSlider: !!document.querySelector(this.selectors.volumeSlider),
            touchControls: !!(document.querySelector(this.selectors.rewindButton) || 
                            document.querySelector(this.selectors.fastForwardButton))
        };
    }
}

// Export for use in main script
window.HuluPlatform = HuluPlatform;