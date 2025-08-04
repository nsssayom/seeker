/**
 * Netflix Platform Integration
 * Specific handling for Netflix video player
 */
class NetflixPlatform {
    constructor() {
        this.name = 'Netflix';
        this.selectors = {
            video: 'video, .VideoContainer video',
            playerContainer: '.watch-video--player-view, .NFPlayer',
            controls: '.PlayerControlsNeo__all-controls',
            seekBar: '.scrubber-bar, .progress-bar',
            playButton: '.button-nfplayerPlay, .button-nfplayerPause',
            volumeButton: '.volume-control',
            fullscreenButton: '.button-nfplayerFullscreen',
            skipIntroButton: '.skip-credits',
            nextEpisodeButton: '.button-nfplayerNextEpisode',
            subtitlesButton: '.audio-subtitle-controller',
            backButton: '.button-nfplayerBack10',
            forwardButton: '.button-nfplayerFastForward',
            qualityButton: '.quality-menu-button'
        };
        
        this.isInitialized = false;
        this.observers = [];
        this.netflixAPI = null;
    }

    /**
     * Initialize platform-specific features
     */
    initialize() {
        if (this.isInitialized) return;
        
        logger.platform('netflix', 'Initializing Netflix integration');
        
        this.detectNetflixAPI();
        this.setupSkipHandler();
        this.setupEpisodeNavigation();
        this.setupQualityDetection();
        this.enhancePlayerControls();
        
        this.isInitialized = true;
        logger.platform('netflix', 'Netflix integration initialized');
    }

    /**
     * Detect Netflix's internal API
     */
    detectNetflixAPI() {
        // Netflix exposes some player information through window.netflix
        if (window.netflix && window.netflix.appContext) {
            this.netflixAPI = window.netflix;
            logger.platform('netflix', 'Netflix API detected');
        }
    }

    /**
     * Setup skip intro/credits handler
     */
    setupSkipHandler() {
        const observer = new MutationObserver(() => {
            const skipButton = document.querySelector(this.selectors.skipIntroButton);
            if (skipButton && skipButton.offsetParent !== null) {
                logger.platform('netflix', 'Skip button available');
                
                // Add keyboard shortcut (S key)
                const handleSkip = (event) => {
                    if (event.code === 'KeyS' && !event.ctrlKey && !event.altKey && !event.metaKey) {
                        skipButton.click();
                        logger.platform('netflix', 'Skip triggered via keyboard');
                        event.preventDefault();
                    }
                };
                
                document.addEventListener('keydown', handleSkip);
                skipButton._seekerSkipHandler = handleSkip;
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        this.observers.push(observer);
    }

    /**
     * Setup episode navigation
     */
    setupEpisodeNavigation() {
        // Next episode button
        const observer = new MutationObserver(() => {
            const nextButton = document.querySelector(this.selectors.nextEpisodeButton);
            if (nextButton && nextButton.offsetParent !== null) {
                logger.platform('netflix', 'Next episode button available');
                
                // Add keyboard shortcut (N key)
                const handleNext = (event) => {
                    if (event.code === 'KeyN' && !event.ctrlKey && !event.altKey && !event.metaKey) {
                        nextButton.click();
                        logger.platform('netflix', 'Next episode triggered via keyboard');
                        event.preventDefault();
                    }
                };
                
                document.addEventListener('keydown', handleNext);
                nextButton._seekerNextHandler = handleNext;
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        this.observers.push(observer);
    }

    /**
     * Setup quality detection and control
     */
    setupQualityDetection() {
        const video = this.getVideoElement();
        if (!video) return;

        // Monitor quality changes
        const observer = new MutationObserver(() => {
            const quality = this.getCurrentQuality();
            if (quality) {
                logger.platform('netflix', `Quality changed to: ${quality}`);
            }
        });

        observer.observe(video, {
            attributes: true,
            attributeFilter: ['src', 'currentSrc']
        });
        
        this.observers.push(observer);
    }

    /**
     * Enhance player controls with additional functionality
     */
    enhancePlayerControls() {
        // Add custom keyboard shortcuts for Netflix-specific features
        this.addCustomShortcuts();
        this.improveSeekAccuracy();
    }

    /**
     * Add custom keyboard shortcuts
     */
    addCustomShortcuts() {
        const shortcuts = [
            {
                key: 'KeyC',
                action: () => this.toggleSubtitles(),
                description: 'Toggle subtitles'
            },
            {
                key: 'KeyQ',
                action: () => this.cycleQuality(),
                description: 'Cycle quality'
            },
            {
                key: 'KeyB',
                action: () => this.goBack(),
                description: 'Go back'
            }
        ];

        shortcuts.forEach(shortcut => {
            document.addEventListener('keydown', (event) => {
                if (event.code === shortcut.key && !event.ctrlKey && !event.altKey && !event.metaKey) {
                    if (!this.isInputFocused()) {
                        shortcut.action();
                        event.preventDefault();
                    }
                }
            });
        });
    }

    /**
     * Improve seek accuracy for Netflix
     */
    improveSeekAccuracy() {
        const seekBar = document.querySelector(this.selectors.seekBar);
        if (!seekBar) return;

        // Netflix sometimes has issues with precise seeking
        seekBar.addEventListener('click', (event) => {
            // Add small delay to ensure seek completes
            setTimeout(() => {
                const video = this.getVideoElement();
                if (video) {
                    logger.platform('netflix', `Seek completed to: ${video.currentTime}`);
                }
            }, 100);
        });
    }

    /**
     * Toggle subtitles
     */
    toggleSubtitles() {
        const subtitlesButton = document.querySelector(this.selectors.subtitlesButton);
        if (subtitlesButton) {
            subtitlesButton.click();
            logger.platform('netflix', 'Subtitles toggled');
        }
    }

    /**
     * Cycle through quality options
     */
    cycleQuality() {
        const qualityButton = document.querySelector(this.selectors.qualityButton);
        if (qualityButton) {
            qualityButton.click();
            logger.platform('netflix', 'Quality menu opened');
        }
    }

    /**
     * Go back (Netflix back button)
     */
    goBack() {
        const backButton = document.querySelector(this.selectors.backButton);
        if (backButton) {
            backButton.click();
            logger.platform('netflix', 'Back button clicked');
        } else {
            // Fallback to browser back
            window.history.back();
        }
    }

    /**
     * Check if input is focused
     * @returns {boolean} Whether input is focused
     */
    isInputFocused() {
        const activeElement = document.activeElement;
        return activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.contentEditable === 'true'
        );
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
     * Get current playback quality
     * @returns {string|null} Current quality setting
     */
    getCurrentQuality() {
        const video = this.getVideoElement();
        if (!video) return null;

        // Try to extract quality from video source
        const src = video.currentSrc || video.src;
        if (src) {
            // Netflix URLs often contain quality indicators
            const qualityMatch = src.match(/(\d{3,4}p)|(\d{3,4}x\d{3,4})/);
            if (qualityMatch) {
                return qualityMatch[0];
            }
        }

        // Estimate quality from video dimensions
        const videoWidth = video.videoWidth;
        if (videoWidth >= 3840) return '4K';
        if (videoWidth >= 1920) return '1080p';
        if (videoWidth >= 1280) return '720p';
        if (videoWidth >= 854) return '480p';
        
        return 'Auto';
    }

    /**
     * Check if ads are currently playing (Netflix Premium doesn't have ads)
     * @returns {boolean} Whether ads are playing
     */
    isAdPlaying() {
        // Netflix Premium doesn't have ads, but ad-supported tier might
        return false;
    }

    /**
     * Get current audio/subtitle language
     * @returns {Object} Current language settings
     */
    getCurrentLanguageSettings() {
        // This would require deeper integration with Netflix's API
        return {
            audio: null,
            subtitles: null
        };
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
     * Get Netflix-specific metadata
     * @returns {Object} Metadata information
     */
    getMetadata() {
        if (this.netflixAPI && this.netflixAPI.appContext) {
            return {
                title: this.extractTitleFromPage(),
                episode: this.extractEpisodeInfo(),
                hasNextEpisode: !!document.querySelector(this.selectors.nextEpisodeButton)
            };
        }
        
        return {
            title: document.title,
            episode: null,
            hasNextEpisode: false
        };
    }

    /**
     * Extract title from page
     * @returns {string|null} Title
     */
    extractTitleFromPage() {
        const titleElement = document.querySelector('.video-title, .episode-title, h1');
        return titleElement ? titleElement.textContent.trim() : null;
    }

    /**
     * Extract episode information
     * @returns {Object|null} Episode info
     */
    extractEpisodeInfo() {
        const episodeElement = document.querySelector('.episode-meta, .episode-info');
        if (episodeElement) {
            const text = episodeElement.textContent;
            const match = text.match(/S(\d+):E(\d+)/);
            if (match) {
                return {
                    season: parseInt(match[1]),
                    episode: parseInt(match[2])
                };
            }
        }
        return null;
    }

    /**
     * Clean up platform-specific observers and handlers
     */
    cleanup() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
        
        // Clean up skip button handlers
        const skipButton = document.querySelector(this.selectors.skipIntroButton);
        if (skipButton && skipButton._seekerSkipHandler) {
            document.removeEventListener('keydown', skipButton._seekerSkipHandler);
            delete skipButton._seekerSkipHandler;
        }
        
        // Clean up next episode handlers
        const nextButton = document.querySelector(this.selectors.nextEpisodeButton);
        if (nextButton && nextButton._seekerNextHandler) {
            document.removeEventListener('keydown', nextButton._seekerNextHandler);
            delete nextButton._seekerNextHandler;
        }
        
        this.isInitialized = false;
        logger.platform('netflix', 'Netflix integration cleaned up');
    }

    /**
     * Get platform-specific features
     * @returns {Object} Available features
     */
    getFeatures() {
        return {
            skipIntro: !!document.querySelector(this.selectors.skipIntroButton),
            nextEpisode: !!document.querySelector(this.selectors.nextEpisodeButton),
            subtitles: !!document.querySelector(this.selectors.subtitlesButton),
            qualityControl: !!document.querySelector(this.selectors.qualityButton),
            backButton: !!document.querySelector(this.selectors.backButton),
            forwardButton: !!document.querySelector(this.selectors.forwardButton)
        };
    }
}

// Export for use in main script
window.NetflixPlatform = NetflixPlatform;
