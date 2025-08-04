/**
 * Player Detection System
 * Detects and manages video players across different platforms
 */
class PlayerDetector {
    constructor() {
        this.detectors = new Map();
        this.currentPlayer = null;
        this.observers = [];
        this.onPlayerChange = null;
        
        this.initializeDetectors();
        this.startDetection();
    }

    /**
     * Initialize platform-specific detectors
     */
    initializeDetectors() {
        const hostname = DOMUtils.getHostname();
        
        // Platform-specific video selectors and metadata
        const platformConfigs = {
            'paramountplus.com': {
                name: 'Paramount+',
                videoSelectors: ['video[data-element-id]', '.aa-player-skin video', 'video'],
                playerContainerSelectors: ['.aa-player-skin', '.player-wrapper'],
                seekBarSelectors: ['.seek-bar', '.seek-bar-progress'],
                playButtonSelectors: ['.btn-play-pause', '.controls-bottom-btn'],
                volumeSelectors: ['.btn-volume', '.controls-volume-slider'],
                fullscreenSelectors: ['.btn-fullscreen']
            },
            'hulu.com': {
                name: 'Hulu',
                videoSelectors: ['video', '.player-video video'],
                playerContainerSelectors: ['.player-container', '.video-player'],
                seekBarSelectors: ['.progress-bar', '.scrubber'],
                playButtonSelectors: ['.play-pause-button'],
                volumeSelectors: ['.volume-control'],
                fullscreenSelectors: ['.fullscreen-button']
            },
            'disneyplus.com': {
                name: 'Disney+',
                videoSelectors: ['video', '.btm-media-overlays-container video'],
                playerContainerSelectors: ['.btm-media-overlays-container'],
                seekBarSelectors: ['.slider-container'],
                playButtonSelectors: ['.control-icon-btn'],
                volumeSelectors: ['.volume-control'],
                fullscreenSelectors: ['.fullscreen-icon']
            }
        };

        // Find matching platform configuration
        for (const [domain, config] of Object.entries(platformConfigs)) {
            if (hostname.includes(domain)) {
                this.detectors.set(domain, config);
                logger.info(`Initialized detector for ${config.name}`);
                break;
            }
        }

        // Fallback generic detector
        if (this.detectors.size === 0) {
            this.detectors.set('generic', {
                name: 'Generic',
                videoSelectors: ['video'],
                playerContainerSelectors: ['.video-player', '.player', '.media-player'],
                seekBarSelectors: ['.progress', '.seek', '.scrubber'],
                playButtonSelectors: ['.play', '.pause', '[aria-label*="play"]', '[aria-label*="pause"]'],
                volumeSelectors: ['.volume', '[aria-label*="volume"]', '[aria-label*="mute"]'],
                fullscreenSelectors: ['.fullscreen', '[aria-label*="fullscreen"]']
            });
            logger.info('Using generic detector');
        }
    }

    /**
     * Start player detection
     */
    startDetection() {
        this.detectPlayer();
        
        // Set up mutation observer to detect dynamic changes
        const observer = new MutationObserver(DOMUtils.debounce(() => {
            this.detectPlayer();
        }, 500));

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'class', 'id']
        });

        this.observers.push(observer);
        
        // Also check on URL changes (for SPAs)
        let currentUrl = window.location.href;
        setInterval(() => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                setTimeout(() => this.detectPlayer(), 1000);
            }
        }, 1000);
    }

    /**
     * Detect the current player
     */
    async detectPlayer() {
        try {
            const configs = Array.from(this.detectors.values());
            
            for (const config of configs) {
                const player = await this.detectPlayerWithConfig(config);
                if (player) {
                    if (!this.currentPlayer || this.currentPlayer.video !== player.video) {
                        this.currentPlayer = player;
                        logger.info(`Detected player: ${config.name}`, player);
                        
                        if (this.onPlayerChange) {
                            this.onPlayerChange(player);
                        }
                    }
                    return;
                }
            }

            // If no specific player found, try generic detection
            if (this.currentPlayer) {
                logger.debug('Player lost, clearing current player');
                this.currentPlayer = null;
                if (this.onPlayerChange) {
                    this.onPlayerChange(null);
                }
            }
        } catch (error) {
            logger.error('Error detecting player:', error);
        }
    }

    /**
     * Detect player with specific configuration
     * @param {Object} config - Platform configuration
     * @returns {Promise<Object|null>} Player object or null
     */
    async detectPlayerWithConfig(config) {
        try {
            // Find video element
            let video = null;
            for (const selector of config.videoSelectors) {
                video = document.querySelector(selector);
                if (video && video.readyState > 0) break;
            }

            if (!video) return null;

            // Find player container
            let container = null;
            for (const selector of config.playerContainerSelectors) {
                container = document.querySelector(selector);
                if (container && container.contains(video)) break;
            }

            if (!container) {
                container = video.closest('[class*="player"]') || video.closest('[id*="player"]') || video.parentElement;
            }

            // Find control elements
            const controls = {
                seekBar: this.findElement(config.seekBarSelectors, container),
                playButton: this.findElement(config.playButtonSelectors, container),
                volumeControl: this.findElement(config.volumeSelectors, container),
                fullscreenButton: this.findElement(config.fullscreenSelectors, container)
            };

            return {
                platform: config.name,
                video,
                container,
                controls,
                config
            };
        } catch (error) {
            logger.error(`Error detecting player for ${config.name}:`, error);
            return null;
        }
    }

    /**
     * Find element using multiple selectors
     * @param {string[]} selectors - Array of CSS selectors
     * @param {Element} context - Context to search within
     * @returns {Element|null} Found element or null
     */
    findElement(selectors, context = document) {
        for (const selector of selectors) {
            const element = context.querySelector(selector);
            if (element) return element;
        }
        return null;
    }

    /**
     * Get the current player
     * @returns {Object|null} Current player object
     */
    getCurrentPlayer() {
        return this.currentPlayer;
    }

    /**
     * Set player change callback
     * @param {Function} callback - Callback function
     */
    setPlayerChangeCallback(callback) {
        this.onPlayerChange = callback;
    }

    /**
     * Check if a player is currently active
     * @returns {boolean} Whether a player is active
     */
    hasActivePlayer() {
        return this.currentPlayer !== null && 
               this.currentPlayer.video && 
               !this.currentPlayer.video.ended;
    }

    /**
     * Cleanup observers
     */
    destroy() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
        this.currentPlayer = null;
        this.onPlayerChange = null;
    }
}
