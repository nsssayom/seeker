/**
 * YouTube Platform Integration
 * Specific handling for YouTube video player
 */
class YouTubePlatform {
    constructor() {
        this.name = 'YouTube';
        this.selectors = {
            video: 'video.html5-main-video, #movie_player video',
            playerContainer: '#movie_player, .html5-video-player',
            controls: '.ytp-chrome-bottom',
            seekBar: '.ytp-progress-bar, .ytp-scrubber-container',
            playButton: '.ytp-play-button',
            volumeButton: '.ytp-mute-button',
            fullscreenButton: '.ytp-fullscreen-button',
            settingsButton: '.ytp-settings-button',
            nextButton: '.ytp-next-button',
            prevButton: '.ytp-prev-button',
            subtitlesButton: '.ytp-subtitles-button',
            qualityButton: '.ytp-settings-button',
            miniplayerButton: '.ytp-miniplayer-button'
        };
        
        // YouTube-specific settings
        this.settings = {
            useNativeVolumeControls: true, // Prefer YouTube's volume controls
            useNativeSeekControls: false,  // Use our seek controls
            useNativePlaybackControls: false // Use our playback controls
        };
        
        this.isInitialized = false;
        this.observers = [];
        this.youtubeAPI = null;
    }

    /**
     * Initialize platform-specific features
     */
    initialize() {
        if (this.isInitialized) return;
        
        logger.platform('youtube', 'Initializing YouTube integration');
        
        this.detectYouTubeAPI();
        this.setupPlayerStateMonitoring();
        this.setupPlaylistNavigation();
        this.enhanceKeyboardShortcuts();
        this.setupQualityMonitoring();
        
        this.isInitialized = true;
        logger.platform('youtube', 'YouTube integration initialized');
    }

    /**
     * Detect YouTube's API
     */
    detectYouTubeAPI() {
        // YouTube exposes player through various global objects
        if (window.ytplayer || window.yt) {
            this.youtubeAPI = window.ytplayer || window.yt;
            logger.platform('youtube', 'YouTube API detected');
        }
    }

    /**
     * Setup player state monitoring
     */
    setupPlayerStateMonitoring() {
        const video = this.getVideoElement();
        if (!video) return;

        // Monitor for video changes (new video loaded)
        let currentSrc = video.src;
        const checkVideoChange = () => {
            if (video.src !== currentSrc) {
                currentSrc = video.src;
                logger.platform('youtube', 'Video changed, reinitializing');
                setTimeout(() => this.initialize(), 1000);
            }
        };

        setInterval(checkVideoChange, 2000);

        // Monitor player state changes
        video.addEventListener('play', () => {
            logger.platform('youtube', 'Video started playing');
        });

        video.addEventListener('pause', () => {
            logger.platform('youtube', 'Video paused');
        });

        video.addEventListener('ended', () => {
            logger.platform('youtube', 'Video ended');
        });
    }

    /**
     * Setup playlist navigation enhancements
     */
    setupPlaylistNavigation() {
        // Enhanced next/previous with keyboard shortcuts
        const nextButton = document.querySelector(this.selectors.nextButton);
        const prevButton = document.querySelector(this.selectors.prevButton);

        if (nextButton) {
            // Shift+N for next video
            document.addEventListener('keydown', (event) => {
                if (event.code === 'KeyN' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
                    if (!this.isInputFocused()) {
                        nextButton.click();
                        logger.platform('youtube', 'Next video triggered via keyboard');
                        event.preventDefault();
                    }
                }
            });
        }

        if (prevButton) {
            // Shift+P for previous video
            document.addEventListener('keydown', (event) => {
                if (event.code === 'KeyP' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
                    if (!this.isInputFocused()) {
                        prevButton.click();
                        logger.platform('youtube', 'Previous video triggered via keyboard');
                        event.preventDefault();
                    }
                }
            });
        }
    }

    /**
     * Enhance keyboard shortcuts beyond default YouTube ones
     */
    enhanceKeyboardShortcuts() {
        const shortcuts = [
            {
                key: 'KeyC',
                modifiers: { shift: true },
                action: () => this.toggleSubtitles(),
                description: 'Toggle subtitles (Shift+C)'
            },
            {
                key: 'KeyQ',
                action: () => this.openQualityMenu(),
                description: 'Open quality menu (Q)'
            },
            {
                key: 'KeyI',
                action: () => this.toggleMiniplayer(),
                description: 'Toggle miniplayer (I)'
            },
            {
                key: 'KeyT',
                action: () => this.toggleTheaterMode(),
                description: 'Toggle theater mode (T)'
            }
        ];

        shortcuts.forEach(shortcut => {
            document.addEventListener('keydown', (event) => {
                if (event.code === shortcut.key) {
                    const modifiersMatch = this.checkModifiers(event, shortcut.modifiers || {});
                    if (modifiersMatch && !this.isInputFocused()) {
                        shortcut.action();
                        event.preventDefault();
                        logger.platform('youtube', `Executed: ${shortcut.description}`);
                    }
                }
            });
        });
    }

    /**
     * Check if event modifiers match requirements
     * @param {KeyboardEvent} event - Keyboard event
     * @param {Object} required - Required modifiers
     * @returns {boolean} Whether modifiers match
     */
    checkModifiers(event, required) {
        const { shift = false, ctrl = false, alt = false, meta = false } = required;
        return event.shiftKey === shift &&
               event.ctrlKey === ctrl &&
               event.altKey === alt &&
               event.metaKey === meta;
    }

    /**
     * Setup quality monitoring
     */
    setupQualityMonitoring() {
        // Monitor quality changes through settings menu
        const observer = new MutationObserver(() => {
            const qualityDisplay = document.querySelector('.ytp-quality-menu .ytp-menuitem[aria-checked="true"]');
            if (qualityDisplay) {
                const quality = qualityDisplay.textContent.trim();
                logger.platform('youtube', `Quality: ${quality}`);
            }
        });

        const settingsMenu = document.querySelector('.ytp-settings-menu');
        if (settingsMenu) {
            observer.observe(settingsMenu, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['aria-checked']
            });
            
            this.observers.push(observer);
        }
    }

    /**
     * Toggle subtitles
     */
    toggleSubtitles() {
        const subtitlesButton = document.querySelector(this.selectors.subtitlesButton);
        if (subtitlesButton) {
            subtitlesButton.click();
            logger.platform('youtube', 'Subtitles toggled');
        }
    }

    /**
     * Open quality menu
     */
    openQualityMenu() {
        const settingsButton = document.querySelector(this.selectors.settingsButton);
        if (settingsButton) {
            settingsButton.click();
            
            // Wait for menu to open, then click quality option
            setTimeout(() => {
                const qualityOption = document.querySelector('.ytp-menuitem[role="menuitem"]:nth-child(1)');
                if (qualityOption) {
                    qualityOption.click();
                    logger.platform('youtube', 'Quality menu opened');
                }
            }, 100);
        }
    }

    /**
     * Toggle miniplayer
     */
    toggleMiniplayer() {
        const miniplayerButton = document.querySelector(this.selectors.miniplayerButton);
        if (miniplayerButton) {
            miniplayerButton.click();
            logger.platform('youtube', 'Miniplayer toggled');
        }
    }

    /**
     * Toggle theater mode
     */
    toggleTheaterMode() {
        // YouTube theater mode toggle
        const theaterButton = document.querySelector('.ytp-size-button');
        if (theaterButton) {
            theaterButton.click();
            logger.platform('youtube', 'Theater mode toggled');
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
            activeElement.contentEditable === 'true' ||
            activeElement.id === 'contenteditable-root' // YouTube comments
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
        const qualityDisplay = document.querySelector('.ytp-quality-menu .ytp-menuitem[aria-checked="true"]');
        if (qualityDisplay) {
            return qualityDisplay.textContent.trim();
        }

        // Fallback: estimate from video dimensions
        const video = this.getVideoElement();
        if (video) {
            const height = video.videoHeight;
            if (height >= 2160) return '4K';
            if (height >= 1440) return '1440p';
            if (height >= 1080) return '1080p';
            if (height >= 720) return '720p';
            if (height >= 480) return '480p';
            if (height >= 360) return '360p';
        }
        
        return 'Auto';
    }

    /**
     * Check if ads are currently playing
     * @returns {boolean} Whether ads are playing
     */
    isAdPlaying() {
        const adIndicator = document.querySelector('.ytp-ad-player-overlay, .ytp-ad-text');
        return !!adIndicator;
    }

    /**
     * Get video metadata
     * @returns {Object} Video metadata
     */
    getMetadata() {
        return {
            title: this.getVideoTitle(),
            channel: this.getChannelName(),
            duration: this.getVideoDuration(),
            isLive: this.isLiveStream(),
            isPlaylist: this.isInPlaylist()
        };
    }

    /**
     * Get video title
     * @returns {string|null} Video title
     */
    getVideoTitle() {
        const titleElement = document.querySelector('.title.style-scope.ytd-video-primary-info-renderer, .ytp-title-link');
        return titleElement ? titleElement.textContent.trim() : null;
    }

    /**
     * Get channel name
     * @returns {string|null} Channel name
     */
    getChannelName() {
        const channelElement = document.querySelector('.ytd-channel-name a, .ytp-title-channel-name');
        return channelElement ? channelElement.textContent.trim() : null;
    }

    /**
     * Get video duration
     * @returns {number|null} Duration in seconds
     */
    getVideoDuration() {
        const video = this.getVideoElement();
        return video ? video.duration : null;
    }

    /**
     * Check if current video is a live stream
     * @returns {boolean} Whether it's a live stream
     */
    isLiveStream() {
        return !!document.querySelector('.ytp-live, .style-scope.ytd-badge-supported-renderer[aria-label="LIVE"]');
    }

    /**
     * Check if video is part of a playlist
     * @returns {boolean} Whether in playlist
     */
    isInPlaylist() {
        return !!document.querySelector('.ytd-playlist-panel-renderer, .ytp-next-button');
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
     * Get playback speed
     * @returns {number} Current playback speed
     */
    getPlaybackSpeed() {
        const video = this.getVideoElement();
        return video ? video.playbackRate : 1;
    }

    /**
     * Set playback speed
     * @param {number} speed - Playback speed (e.g., 1.25, 1.5, 2)
     */
    setPlaybackSpeed(speed) {
        const video = this.getVideoElement();
        if (video) {
            video.playbackRate = speed;
            logger.platform('youtube', `Playback speed set to: ${speed}x`);
        }
    }

    /**
     * Check if we should handle volume controls (respects user preference for native YouTube controls)
     * @returns {boolean} Whether to handle volume controls
     */
    shouldHandleVolumeControls() {
        return !this.settings.useNativeVolumeControls;
    }

    /**
     * Check if we should handle seek controls
     * @returns {boolean} Whether to handle seek controls
     */
    shouldHandleSeekControls() {
        return !this.settings.useNativeSeekControls;
    }

    /**
     * Check if we should handle playback controls
     * @returns {boolean} Whether to handle playback controls
     */
    shouldHandlePlaybackControls() {
        return !this.settings.useNativePlaybackControls;
    }

    /**
     * Clean up platform-specific observers and handlers
     */
    cleanup() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
        
        this.isInitialized = false;
        logger.platform('youtube', 'YouTube integration cleaned up');
    }

    /**
     * Get platform-specific features
     * @returns {Object} Available features
     */
    getFeatures() {
        return {
            nextVideo: !!document.querySelector(this.selectors.nextButton),
            prevVideo: !!document.querySelector(this.selectors.prevButton),
            subtitles: !!document.querySelector(this.selectors.subtitlesButton),
            qualityControl: !!document.querySelector(this.selectors.qualityButton),
            miniplayer: !!document.querySelector(this.selectors.miniplayerButton),
            theaterMode: !!document.querySelector('.ytp-size-button'),
            isLive: this.isLiveStream(),
            isPlaylist: this.isInPlaylist(),
            playbackSpeed: true
        };
    }
}

// Export for use in main script
window.YouTubePlatform = YouTubePlatform;
