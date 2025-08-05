/**
 * Paramount+ Platform Integration
 * Specific handling for Paramount+ video player
 */
class ParamountPlatform {
    constructor() {
        this.name = 'Paramount+';
        this.selectors = {
            video: 'video[data-element-id], .aa-player-skin video, video',
            playerContainer: '.aa-player-skin, .player-wrapper',
            controls: '.controls-manager',
            seekBar: '.seek-bar, .seek-bar-progress',
            playButton: '.btn-play-pause, .controls-bottom-btn',
            volumeButton: '.btn-volume',
            volumeSlider: '.controls-volume-slider',
            fullscreenButton: '.btn-fullscreen',
            skipIntroButton: '.skip-button',
            nextEpisodeButton: '.btn-next',
            rewindButton: '.btn-rewind',
            fastForwardButton: '.btn-fast-forward',
            timeDisplay: '.controls-progress-time, .controls-duration',
            ccButton: '.btn-audio-cc'
        };
        
        this.isInitialized = false;
        this.observers = [];
    }

    /**
     * Initialize platform-specific features
     */
    initialize() {
        if (this.isInitialized) return;
        
        logger.platform('paramount', 'Initializing Paramount+ integration');
        
        this.setupControlsObserver();
        this.setupSkipIntroHandler();
        this.setupNextEpisodeHandler();
        this.enhanceSeekBar();
        this.preventPageScrollOnSpace();
        
        this.isInitialized = true;
        logger.platform('paramount', 'Paramount+ integration initialized');
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
                attributeFilter: ['class', 'aria-hidden']
            });
            
            this.observers.push(observer);
        }
    }

    /**
     * Handle controls visibility changes
     */
    handleControlsVisibility() {
        const controls = document.querySelector(this.selectors.controls);
        if (!controls) return;

        const isVisible = !controls.classList.contains('remove') && 
                         controls.getAttribute('aria-hidden') !== 'true';
        
        logger.platform('paramount', `Controls visibility: ${isVisible}`);
        
        // You can add custom logic here for when controls show/hide
    }

    /**
     * Setup skip intro button handler
     */
    setupSkipIntroHandler() {
        const checkForSkipButton = () => {
            const skipButton = document.querySelector(this.selectors.skipIntroButton);
            if (skipButton && !skipButton.disabled && skipButton.style.display !== 'none') {
                logger.platform('paramount', 'Skip intro button available');
                
                // Add keyboard shortcut for skip intro (S key)
                const handleSkipIntro = (event) => {
                    if (event.code === 'KeyS' && !event.ctrlKey && !event.altKey && !event.metaKey) {
                        skipButton.click();
                        logger.platform('paramount', 'Skip intro triggered via keyboard');
                        event.preventDefault();
                    }
                };
                
                document.addEventListener('keydown', handleSkipIntro);
                
                // Clean up after skip button disappears
                const observer = new MutationObserver(() => {
                    if (skipButton.disabled || skipButton.style.display === 'none') {
                        document.removeEventListener('keydown', handleSkipIntro);
                        observer.disconnect();
                    }
                });
                
                observer.observe(skipButton, {
                    attributes: true,
                    attributeFilter: ['disabled', 'style']
                });
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
            if (nextButton && nextButton.style.display !== 'none') {
                logger.platform('paramount', 'Next episode button available');
                
                // Add keyboard shortcut for next episode (N key)
                const handleNextEpisode = (event) => {
                    if (event.code === 'KeyN' && !event.ctrlKey && !event.altKey && !event.metaKey) {
                        nextButton.click();
                        logger.platform('paramount', 'Next episode triggered via keyboard');
                        event.preventDefault();
                    }
                };
                
                document.addEventListener('keydown', handleNextEpisode);
                
                // Store reference for cleanup
                nextButton._seekerHandler = handleNextEpisode;
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

        // Add hover effects and preview (if enabled in settings)
        seekBar.addEventListener('mouseenter', () => {
            logger.platform('paramount', 'Seek bar hover detected');
        });

        // Improve click accuracy
        seekBar.addEventListener('click', (event) => {
            event.stopPropagation();
            logger.platform('paramount', 'Seek bar clicked');
        });
    }

    /**
     * Prevent page scroll when space is used for play/pause
     */
    preventPageScrollOnSpace() {
        // Simple scroll prevention only - notifications handled by media controller
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
                    
                    logger.platform('paramount', 'Prevented space scroll');
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
        // Paramount+ doesn't expose quality info easily
        // This would need deeper integration with their player API
        return null;
    }

    /**
     * Check if ads are currently playing
     * @returns {boolean} Whether ads are playing
     */
    isAdPlaying() {
        const adContainer = document.querySelector('[data-role="adContainer"]');
        return adContainer && adContainer.style.display !== 'none';
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
            currentTime: document.querySelector('.controls-progress-time'),
            duration: document.querySelector('.controls-duration')
        };
    }

    /**
     * Handle platform-specific fullscreen changes
     */
    handleFullscreenChange() {
        const playerContainer = this.getPlayerContainer();
        if (!playerContainer) return;

        if (DOMUtils.isFullscreen()) {
            logger.platform('paramount', 'Entered fullscreen mode');
            playerContainer.classList.add('seeker-fullscreen');
        } else {
            logger.platform('paramount', 'Exited fullscreen mode');
            playerContainer.classList.remove('seeker-fullscreen');
        }
    }

    /**
     * Inject custom styles for Paramount+
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
        `;
        
        DOMUtils.addCSS(styles, 'seeker-paramount-styles');
    }

    /**
     * Clean up platform-specific observers and handlers
     */
    cleanup() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
        
        // Remove next episode handler if it exists
        const nextButton = document.querySelector(this.selectors.nextEpisodeButton);
        if (nextButton && nextButton._seekerHandler) {
            document.removeEventListener('keydown', nextButton._seekerHandler);
            delete nextButton._seekerHandler;
        }
        
        // Remove space handler if it exists
        if (this._spaceHandler) {
            document.removeEventListener('keypress', this._spaceHandler, true);
            delete this._spaceHandler;
        }
        
        this.isInitialized = false;
        logger.platform('paramount', 'Paramount+ integration cleaned up');
    }

    /**
     * Get platform-specific features
     * @returns {Object} Available features
     */
    getFeatures() {
        return {
            skipIntro: !!document.querySelector(this.selectors.skipIntroButton),
            nextEpisode: !!document.querySelector(this.selectors.nextEpisodeButton),
            rewind: !!document.querySelector(this.selectors.rewindButton),
            fastForward: !!document.querySelector(this.selectors.fastForwardButton),
            closedCaptions: !!document.querySelector(this.selectors.ccButton),
            volumeSlider: !!document.querySelector(this.selectors.volumeSlider)
        };
    }
}

// Export for use in main script
window.ParamountPlatform = ParamountPlatform;
