/**
 * Generic Platform Integration
 * Universal HTML5 video player support for any website
 */
class GenericPlatform {
    constructor() {
        this.name = 'Generic HTML5';
        this.selectors = {
            video: 'video',
            playerContainer: '.video-player, .player, .media-player, [class*="player"], [class*="video"]',
            controls: '.controls, .video-controls, [class*="control"]',
            seekBar: '.progress, .seek, .scrubber, [class*="progress"], [class*="seek"]',
            playButton: '.play, .pause, [aria-label*="play"], [aria-label*="pause"], [class*="play"]',
            volumeButton: '.volume, [aria-label*="volume"], [aria-label*="mute"], [class*="volume"]',
            fullscreenButton: '.fullscreen, [aria-label*="fullscreen"], [class*="fullscreen"]',
            nextButton: '.next, [aria-label*="next"], [class*="next"]',
            prevButton: '.prev, .previous, [aria-label*="prev"], [class*="prev"]',
            settingsButton: '.settings, [aria-label*="settings"], [class*="settings"]',
            captionsButton: '.captions, .subtitles, [aria-label*="captions"], [aria-label*="subtitles"], [class*="caption"], [class*="subtitle"]'
        };
        
        this.isInitialized = false;
        this.observers = [];
        this.videoObserver = null;
    }

    /**
     * Initialize platform-specific features
     */
    initialize() {
        if (this.isInitialized) return;
        
        logger.platform('generic', 'Initializing HTML5 video player integration');
        
        this.setupVideoDetection();
        this.setupGenericEnhancements();
        this.setupSmartKeyboardHandling();
        this.analyzePlayerStructure();
        this.setupHTML5VideoSupport();
        
        this.isInitialized = true;
        logger.platform('generic', 'HTML5 video player integration initialized');
    }

    /**
     * Setup video element detection and monitoring
     */
    setupVideoDetection() {
        // Monitor for new video elements
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const videos = node.tagName === 'VIDEO' ? [node] : node.querySelectorAll('video');
                        videos.forEach(video => this.handleNewVideo(video));
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        this.observers.push(observer);

        // Handle existing videos
        document.querySelectorAll('video').forEach(video => this.handleNewVideo(video));
    }

    /**
     * Handle new video element
     * @param {HTMLVideoElement} video - Video element
     */
    handleNewVideo(video) {
        if (video._seekerHandled) return;
        
        logger.platform('generic', 'New video detected', video);
        
        // Mark as handled
        video._seekerHandled = true;
        
        // Setup video-specific enhancements
        this.enhanceVideoElement(video);
        this.setupVideoEventListeners(video);
    }

    /**
     * Setup HTML5 video standard support
     */
    setupHTML5VideoSupport() {
        // Ensure HTML5 video elements are properly detected
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
            if (!video._seekerHandled) {
                this.enhanceVideoElement(video);
                this.setupVideoEventListeners(video);
                video._seekerHandled = true;
                logger.platform('generic', `Enhanced HTML5 video element: ${video.src || 'blob/media'}`);
            }
        });
        
        // Monitor for dynamically added videos
        const videoObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const videos = node.tagName === 'VIDEO' ? [node] : node.querySelectorAll?.('video') || [];
                        videos.forEach(video => {
                            if (!video._seekerHandled) {
                                this.enhanceVideoElement(video);
                                this.setupVideoEventListeners(video);
                                video._seekerHandled = true;
                                logger.platform('generic', 'Dynamically enhanced new HTML5 video');
                            }
                        });
                    }
                });
            });
        });
        
        videoObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        this.observers.push(videoObserver);
    }

    /**
     * Enhance video element with additional functionality
     * @param {HTMLVideoElement} video - Video element
     */
    enhanceVideoElement(video) {
        // Add custom data attributes for easier identification
        video.setAttribute('data-seeker-enhanced', 'true');
        
        // Improve seeking precision
        video.addEventListener('seeking', () => {
            logger.platform('generic', `Seeking to: ${video.currentTime}`);
        });

        video.addEventListener('seeked', () => {
            logger.platform('generic', `Seek completed: ${video.currentTime}`);
        });
    }

    /**
     * Setup video event listeners
     * @param {HTMLVideoElement} video - Video element
     */
    setupVideoEventListeners(video) {
        const events = [
            'loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough',
            'play', 'pause', 'ended', 'timeupdate', 'volumechange', 'ratechange'
        ];

        events.forEach(eventType => {
            video.addEventListener(eventType, (event) => {
                this.handleVideoEvent(eventType, event, video);
            });
        });
    }

    /**
     * Handle video events
     * @param {string} eventType - Event type
     * @param {Event} event - Event object
     * @param {HTMLVideoElement} video - Video element
     */
    handleVideoEvent(eventType, event, video) {
        switch (eventType) {
            case 'loadedmetadata':
                logger.platform('generic', `Video metadata loaded: ${video.duration}s`);
                break;
            case 'play':
                logger.platform('generic', 'Video started playing');
                break;
            case 'pause':
                logger.platform('generic', 'Video paused');
                break;
            case 'ended':
                logger.platform('generic', 'Video ended');
                this.handleVideoEnd(video);
                break;
            case 'volumechange':
                logger.platform('generic', `Volume changed: ${video.volume}, muted: ${video.muted}`);
                break;
        }
    }

    /**
     * Handle video end
     * @param {HTMLVideoElement} video - Video element
     */
    handleVideoEnd(video) {
        // Try to find next video button
        const nextButton = this.findNextButton();
        if (nextButton) {
            logger.platform('generic', 'Next button found for auto-advance');
        }
    }

    /**
     * Setup generic enhancements for unknown platforms
     */
    setupGenericEnhancements() {
        // Add universal keyboard shortcuts that don't conflict
        this.addUniversalShortcuts();
        this.improveAccessibility();
        this.addSeekPreview();
    }

    /**
     * Add universal keyboard shortcuts
     */
    addUniversalShortcuts() {
        // These are safe shortcuts that are unlikely to conflict
        const shortcuts = [
            {
                key: 'Escape',
                action: () => this.exitFullscreen(),
                description: 'Exit fullscreen'
            },
            {
                key: 'KeyR',
                modifiers: { ctrl: true },
                action: () => this.restartVideo(),
                description: 'Restart video'
            }
        ];

        shortcuts.forEach(shortcut => {
            document.addEventListener('keydown', (event) => {
                if (event.code === shortcut.key) {
                    const modifiersMatch = this.checkModifiers(event, shortcut.modifiers || {});
                    if (modifiersMatch && !this.isInputFocused()) {
                        shortcut.action();
                        event.preventDefault();
                        logger.platform('generic', `Executed: ${shortcut.description}`);
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
     * Improve accessibility
     */
    improveAccessibility() {
        // Add ARIA labels to videos that don't have them
        document.querySelectorAll('video:not([aria-label]):not([aria-labelledby])').forEach(video => {
            video.setAttribute('aria-label', 'Video player');
        });

        // Ensure player containers are focusable
        document.querySelectorAll(this.selectors.playerContainer).forEach(container => {
            if (!container.hasAttribute('tabindex')) {
                container.setAttribute('tabindex', '0');
            }
        });
    }

    /**
     * Add seek preview functionality
     */
    addSeekPreview() {
        const seekBars = document.querySelectorAll(this.selectors.seekBar);
        
        seekBars.forEach(seekBar => {
            if (seekBar._seekerPreviewAdded) return;
            seekBar._seekerPreviewAdded = true;

            seekBar.addEventListener('mousemove', (event) => {
                this.showSeekPreview(event, seekBar);
            });

            seekBar.addEventListener('mouseleave', () => {
                this.hideSeekPreview();
            });
        });
    }

    /**
     * Show seek preview
     * @param {MouseEvent} event - Mouse event
     * @param {Element} seekBar - Seek bar element
     */
    showSeekPreview(event, seekBar) {
        const video = this.getVideoElement();
        if (!video || !video.duration) return;

        const rect = seekBar.getBoundingClientRect();
        const percentage = (event.clientX - rect.left) / rect.width;
        const time = percentage * video.duration;

        this.updateSeekPreview(time, event.clientX, rect.top);
    }

    /**
     * Update seek preview display
     * @param {number} time - Preview time
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    updateSeekPreview(time, x, y) {
        let preview = document.getElementById('seeker-seek-preview');
        
        if (!preview) {
            preview = document.createElement('div');
            preview.id = 'seeker-seek-preview';
            preview.className = 'seeker-seek-preview';
            document.body.appendChild(preview);
        }

        preview.textContent = this.formatTime(time);
        preview.style.left = `${x}px`;
        preview.style.top = `${y - 40}px`;
        preview.style.display = 'block';
    }

    /**
     * Hide seek preview
     */
    hideSeekPreview() {
        const preview = document.getElementById('seeker-seek-preview');
        if (preview) {
            preview.style.display = 'none';
        }
    }

    /**
     * Setup smart keyboard handling for unknown platforms
     */
    setupSmartKeyboardHandling() {
        // Analyze the page to determine which keys are safe to use
        this.analyzeExistingKeyboardHandlers();
    }

    /**
     * Analyze existing keyboard handlers
     */
    analyzeExistingKeyboardHandlers() {
        // This is a placeholder for more sophisticated analysis
        // In a real implementation, you might:
        // 1. Check for existing event listeners
        // 2. Analyze the platform's documentation
        // 3. Test key combinations to see what's handled
        
        logger.platform('generic', 'Analyzing existing keyboard handlers');
    }

    /**
     * Analyze player structure to understand the platform better
     */
    analyzePlayerStructure() {
        const video = this.getVideoElement();
        if (!video) return;

        const container = this.getPlayerContainer();
        const analysis = {
            hasControls: !!this.findElement(this.selectors.controls),
            hasSeekBar: !!this.findElement(this.selectors.seekBar),
            hasPlayButton: !!this.findElement(this.selectors.playButton),
            hasVolumeControl: !!this.findElement(this.selectors.volumeButton),
            hasFullscreenButton: !!this.findElement(this.selectors.fullscreenButton),
            hasNextButton: !!this.findElement(this.selectors.nextButton),
            hasPrevButton: !!this.findElement(this.selectors.prevButton),
            containerClasses: container ? Array.from(container.classList) : [],
            videoAttributes: Array.from(video.attributes).map(attr => attr.name)
        };

        logger.platform('generic', 'Player structure analysis:', analysis);
        return analysis;
    }

    /**
     * Find element using selector
     * @param {string} selector - CSS selector
     * @returns {Element|null} Found element
     */
    findElement(selector) {
        return document.querySelector(selector);
    }

    /**
     * Exit fullscreen
     */
    exitFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
            logger.platform('generic', 'Exited fullscreen');
        }
    }

    /**
     * Restart video
     */
    restartVideo() {
        const video = this.getVideoElement();
        if (video) {
            video.currentTime = 0;
            logger.platform('generic', 'Video restarted');
        }
    }

    /**
     * Find next button
     * @returns {Element|null} Next button element
     */
    findNextButton() {
        return this.findElement(this.selectors.nextButton);
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
     * Format time in MM:SS format
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time
     */
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
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
        const video = this.getVideoElement();
        if (!video) return null;

        // Try to find container using selectors
        for (const selector of this.selectors.playerContainer.split(', ')) {
            const container = document.querySelector(selector);
            if (container && container.contains(video)) {
                return container;
            }
        }

        // Fallback: find parent with player-like characteristics
        let element = video.parentElement;
        while (element && element !== document.body) {
            const className = element.className.toLowerCase();
            if (className.includes('player') || className.includes('video')) {
                return element;
            }
            element = element.parentElement;
        }

        return video.parentElement;
    }

    /**
     * Get current playback quality (generic estimation)
     * @returns {string|null} Current quality setting
     */
    getCurrentQuality() {
        const video = this.getVideoElement();
        if (!video) return null;

        const width = video.videoWidth;
        const height = video.videoHeight;

        if (height >= 2160) return '4K';
        if (height >= 1440) return '1440p';
        if (height >= 1080) return '1080p';
        if (height >= 720) return '720p';
        if (height >= 480) return '480p';
        if (height >= 360) return '360p';
        if (height >= 240) return '240p';

        return `${width}x${height}`;
    }

    /**
     * Check if ads are playing (generic detection)
     * @returns {boolean} Whether ads are playing
     */
    isAdPlaying() {
        // Look for common ad indicators
        const adIndicators = [
            '[class*="ad"]', '[id*="ad"]', '[class*="advertisement"]',
            '[class*="sponsor"]', '[class*="promo"]'
        ];

        return adIndicators.some(selector => {
            const element = document.querySelector(selector);
            return element && DOMUtils.isElementVisible(element);
        });
    }

    /**
     * Get metadata (generic extraction)
     * @returns {Object} Metadata information
     */
    getMetadata() {
        return {
            title: this.extractTitle(),
            description: this.extractDescription(),
            duration: this.getVideoDuration(),
            platform: this.detectPlatform()
        };
    }

    /**
     * Extract title from page
     * @returns {string|null} Page/video title
     */
    extractTitle() {
        // Try various title selectors
        const titleSelectors = [
            'h1', '.title', '.video-title', '[class*="title"]',
            'title', 'meta[property="og:title"]'
        ];

        for (const selector of titleSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                const content = element.content || element.textContent;
                if (content && content.trim()) {
                    return content.trim();
                }
            }
        }

        return document.title;
    }

    /**
     * Extract description from page
     * @returns {string|null} Page/video description
     */
    extractDescription() {
        const descSelectors = [
            'meta[name="description"]', 'meta[property="og:description"]',
            '.description', '.video-description', '[class*="description"]'
        ];

        for (const selector of descSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                const content = element.content || element.textContent;
                if (content && content.trim()) {
                    return content.trim();
                }
            }
        }

        return null;
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
     * Detect platform from URL and page structure
     * @returns {string} Detected platform name
     */
    detectPlatform() {
        const hostname = window.location.hostname;
        
        // Check for common streaming platforms
        const platformPatterns = [
            { pattern: /hulu/, name: 'Hulu' },
            { pattern: /disneyplus/, name: 'Disney+' },
            { pattern: /amazon/, name: 'Amazon Prime' },
            { pattern: /hbomax|max\.com/, name: 'HBO Max' },
            { pattern: /peacocktv/, name: 'Peacock' },
            { pattern: /appletv/, name: 'Apple TV+' },
            { pattern: /crunchyroll/, name: 'Crunchyroll' },
            { pattern: /funimation/, name: 'Funimation' },
            { pattern: /twitch/, name: 'Twitch' },
            { pattern: /vimeo/, name: 'Vimeo' },
            { pattern: /dailymotion/, name: 'Dailymotion' }
        ];

        for (const { pattern, name } of platformPatterns) {
            if (pattern.test(hostname)) {
                return name;
            }
        }

        return 'Unknown Platform';
    }

    /**
     * Clean up platform-specific observers and handlers
     */
    cleanup() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
        
        // Remove seek preview
        const preview = document.getElementById('seeker-seek-preview');
        if (preview) {
            preview.remove();
        }
        
        this.isInitialized = false;
        logger.platform('generic', 'Generic platform integration cleaned up');
    }

    /**
     * Get platform-specific features
     * @returns {Object} Available features
     */
    getFeatures() {
        return {
            basicControls: !!this.findElement(this.selectors.controls),
            seekBar: !!this.findElement(this.selectors.seekBar),
            playButton: !!this.findElement(this.selectors.playButton),
            volumeControl: !!this.findElement(this.selectors.volumeButton),
            fullscreenButton: !!this.findElement(this.selectors.fullscreenButton),
            nextButton: !!this.findElement(this.selectors.nextButton),
            prevButton: !!this.findElement(this.selectors.prevButton),
            seekPreview: true,
            universalShortcuts: true
        };
    }
}

// Export for use in main script
window.GenericPlatform = GenericPlatform;
