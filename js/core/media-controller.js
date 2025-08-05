/**
 * Media Controller
 * Handles media playback control operations
 */
class MediaController {
    constructor() {
        this.currentPlayer = null;
        this.config = window.SeekerConfig;
        
        // Initialize with config defaults
        this.initializeSettings();
    }

    /**
     * Initialize settings with config
     */
    async initializeSettings() {
        if (this.config) {
            await this.config.waitForLoad();
            logger.debug('MediaController initialized with config');
        } else {
            logger.warn('SeekerConfig not available, using fallback');
        }
    }

    /**
     * Set the current player
     * @param {Object} player - Player object from PlayerDetector
     */
    setPlayer(player) {
        this.currentPlayer = player;
        logger.debug('Media controller set player:', player?.platform);
    }

    /**
     * Get the current player
     * @returns {Object|null} Current player object
     */
    getCurrentPlayer() {
        return this.currentPlayer;
    }

    /**
     * Wait for video metadata to be available
     * @param {HTMLVideoElement} video - Video element
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<boolean>} True if metadata is available, false if timeout
     */
    async waitForVideoMetadata(video, timeout = 3000) {
        // Validate video element first
        if (!video || typeof video.duration === 'undefined') {
            logger.warn('Invalid video element provided to waitForVideoMetadata');
            return false;
        }
        
        // Check if metadata is already available
        if (isFinite(video.duration) && video.duration > 0 && isFinite(video.currentTime)) {
            logger.debug('Video metadata already available');
            return true;
        }

        // For Hulu, be more lenient with metadata requirements
        const isHulu = window.location.hostname.includes('hulu.com');
        if (isHulu) {
            // On Hulu, if we have a video element with src and it's not in error state, consider it ready
            if ((video.src || video.currentSrc) && video.readyState >= 1 && !video.error) {
                logger.debug('Hulu video considered ready based on src and readyState');
                return true;
            }
            
            // Also check if video is actively playing (has currentTime changes)
            if (isFinite(video.currentTime) && video.currentTime > 0) {
                logger.debug('Hulu video considered ready based on currentTime');
                return true;
            }
        }

        return new Promise((resolve) => {
            const startTime = Date.now();
            let resolved = false;
            let lastCurrentTime = video.currentTime;
            
            const cleanupAndResolve = (result) => {
                if (resolved) return;
                resolved = true;
                
                video.removeEventListener('loadedmetadata', onLoadedMetadata);
                video.removeEventListener('canplay', onLoadedMetadata);
                video.removeEventListener('timeupdate', onTimeUpdate);
                video.removeEventListener('error', onError);
                
                resolve(result);
            };
            
            const checkMetadata = () => {
                if (resolved) return;
                
                try {
                    // Standard check for duration and currentTime
                    if (isFinite(video.duration) && video.duration > 0 && isFinite(video.currentTime)) {
                        logger.debug('Video metadata became available');
                        cleanupAndResolve(true);
                        return;
                    }
                    
                    // For Hulu, additional checks
                    if (isHulu) {
                        // Check if readyState indicates we can seek
                        if (video.readyState >= 2 && (video.src || video.currentSrc)) {
                            logger.debug('Hulu video ready based on readyState >= 2');
                            cleanupAndResolve(true);
                            return;
                        }
                        
                        // Check if currentTime is changing (video is playing)
                        if (isFinite(video.currentTime) && video.currentTime !== lastCurrentTime) {
                            logger.debug('Hulu video ready based on currentTime change');
                            cleanupAndResolve(true);
                            return;
                        }
                        lastCurrentTime = video.currentTime;
                    }
                    
                    if (Date.now() - startTime > timeout) {
                        logger.debug(`Video metadata timeout after ${timeout}ms`);
                        cleanupAndResolve(false);
                        return;
                    }
                    
                    requestAnimationFrame(checkMetadata);
                } catch (error) {
                    logger.warn('Error checking video metadata:', error);
                    cleanupAndResolve(false);
                }
            };
            
            // Event handlers
            const onLoadedMetadata = () => {
                try {
                    logger.debug('loadedmetadata event fired');
                    if (isFinite(video.duration) && video.duration > 0) {
                        cleanupAndResolve(true);
                    } else {
                        requestAnimationFrame(checkMetadata);
                    }
                } catch (error) {
                    logger.warn('Error in loadedmetadata event:', error);
                    cleanupAndResolve(false);
                }
            };
            
            const onTimeUpdate = () => {
                try {
                    if (isHulu && isFinite(video.currentTime)) {
                        logger.debug('Hulu timeupdate event - video is active');
                        cleanupAndResolve(true);
                    }
                } catch (error) {
                    logger.warn('Error in timeupdate event:', error);
                }
            };
            
            const onError = () => {
                logger.warn('Video error event during metadata wait');
                cleanupAndResolve(false);
            };
            
            video.addEventListener('loadedmetadata', onLoadedMetadata);
            video.addEventListener('canplay', onLoadedMetadata);
            video.addEventListener('timeupdate', onTimeUpdate);
            video.addEventListener('error', onError);
            
            checkMetadata();
        });
    }

    /**
     * Seek forward by specified amount
     * @param {number} amount - Seconds to seek forward (default: config value)
     */
    async seekForward(amount = null) {
        if (amount === null) {
            amount = this.config ? this.config.getSeekAmounts().arrow : 5;
        }
        if (!this.canSeek()) return false;

        const video = this.currentPlayer.video;
        
        // Wait for video metadata to be available
        const metadataReady = await this.waitForVideoMetadata(video, 2000);
        
        if (!metadataReady) {
            logger.warn('Cannot seek: video metadata not available after waiting');
            
            // For Hulu, always try fallback since their player works differently
            if (window.location.hostname.includes('hulu.com')) {
                logger.debug('Using Hulu seek fallback due to metadata not ready');
                return this.attemptHuluSeekFallback(video, amount, 'forward');
            }
            
            return false;
        }
        
        const newTime = Math.min(video.currentTime + amount, video.duration);
        
        try {
            video.currentTime = newTime;
            logger.debug(`Seeked forward ${amount}s to ${newTime.toFixed(2)}s`);
            
            if (this.config && this.config.get('enableNotifications', true)) {
                this.showSeekNotification(`+${amount}s`, newTime);
            }
            
            return true;
        } catch (error) {
            logger.error('Error during seek forward:', error);
            return false;
        }
    }

    /**
     * Seek backward by specified amount
     * @param {number} amount - Seconds to seek backward (default: config value)
     */
    async seekBackward(amount = null) {
        if (amount === null) {
            amount = this.config ? this.config.getSeekAmounts().arrow : 5;
        }
        if (!this.canSeek()) return false;

        const video = this.currentPlayer.video;
        
        // Wait for video metadata to be available
        const metadataReady = await this.waitForVideoMetadata(video, 2000);
        
        if (!metadataReady) {
            logger.warn('Cannot seek: video metadata not available after waiting');
            
            // For Hulu, always try fallback since their player works differently
            if (window.location.hostname.includes('hulu.com')) {
                logger.debug('Using Hulu seek fallback due to metadata not ready');
                return this.attemptHuluSeekFallback(video, amount, 'backward');
            }
            
            return false;
        }
        
        const newTime = Math.max(video.currentTime - amount, 0);
        
        try {
            video.currentTime = newTime;
            logger.debug(`Seeked backward ${amount}s to ${newTime.toFixed(2)}s`);
            
            if (this.config && this.config.get('enableNotifications', true)) {
                this.showSeekNotification(`-${amount}s`, newTime);
            }
            
            return true;
        } catch (error) {
            logger.error('Error during seek backward:', error);
            return false;
        }
    }

    /**
     * Seek forward by extended amount (2x the normal seek amount)
     */
    seekForwardExtended() {
        const extendedAmount = this.config ? this.config.getSeekAmounts().extended : 10;
        return this.seekForward(extendedAmount);
    }

    /**
     * Seek backward by extended amount (2x the normal seek amount)
     */
    seekBackwardExtended() {
        const extendedAmount = this.config ? this.config.getSeekAmounts().extended : 10;
        return this.seekBackward(extendedAmount);
    }

        /**
     * Seek to specific percentage of video
     * @param {number} percentage - Percentage (0-100) to seek to
     */
    async seekToPercentage(percentage) {
        if (!this.canSeek()) return false;

        const video = this.currentPlayer.video;
        
        // Wait for video metadata to be available
        const metadataReady = await this.waitForVideoMetadata(video, 2000);
        
        if (!metadataReady) {
            logger.warn('Cannot seek: video metadata not available after waiting');
            
            // For Hulu, always try fallback since their player works differently
            if (window.location.hostname.includes('hulu.com')) {
                logger.debug('Using Hulu percentage seek fallback due to metadata not ready');
                return this.attemptHuluPercentageSeekFallback(video, percentage);
            }
            
            return false;
        }

        const newTime = (percentage / 100) * video.duration;
        
        // Validate the calculated time
        if (!isFinite(newTime) || newTime < 0) {
            logger.warn('Cannot seek: calculated time is invalid', { newTime, percentage, duration: video.duration });
            return false;
        }
        
        try {
            video.currentTime = newTime;
            logger.debug(`Seeked to ${percentage}% (${newTime.toFixed(2)}s)`);
            
            if (this.config && this.config.get('enableNotifications', true)) {
                this.showSeekNotification(`${percentage}%`, newTime);
            }
            
            return true;
        } catch (error) {
            logger.error('Error during percentage seek:', error);
            return false;
        }
    }

    /**
     * Fallback seek method for Hulu when metadata isn't available
     * @param {HTMLVideoElement} video - Video element
     * @param {number} amount - Seek amount in seconds
     * @param {string} direction - 'forward' or 'backward'
     * @returns {boolean} Success status
     */
    attemptHuluSeekFallback(video, amount, direction) {
        try {
            logger.debug(`Attempting Hulu seek fallback: ${direction} ${amount}s`);
            
            // Try using Hulu's native touch controls first (rewind/forward buttons)
            if (direction === 'forward') {
                const forwardButton = document.querySelector('[data-testid="forward-click-target"], .PlaybackTouchControls__forward');
                if (forwardButton && forwardButton.offsetParent !== null) {
                    logger.debug('Using Hulu forward button for seek');
                    forwardButton.click();
                    
                    if (this.config && this.config.get('enableNotifications', true)) {
                        this.showSeekNotification(`+${amount}s`, 0);
                    }
                    return true;
                }
            } else {
                const rewindButton = document.querySelector('[data-testid="rewind-click-target"], .PlaybackTouchControls__rewind');
                if (rewindButton && rewindButton.offsetParent !== null) {
                    logger.debug('Using Hulu rewind button for seek');
                    rewindButton.click();
                    
                    if (this.config && this.config.get('enableNotifications', true)) {
                        this.showSeekNotification(`-${amount}s`, 0);
                    }
                    return true;
                }
            }
            
            // Try seeking through progress bar if native buttons aren't available
            const seekBar = document.querySelector('.progress-bar, .scrubber-bar, [data-testid*="progress"], [data-testid*="scrubber"]');
            
            if (seekBar) {
                const rect = seekBar.getBoundingClientRect();
                
                // Try to get current position from progress indicator
                const progressIndicator = seekBar.querySelector('[style*="width"], [style*="transform"], .progress-filled');
                let currentPercentage = 0;
                
                if (progressIndicator) {
                    // Try to extract current position from style
                    const style = progressIndicator.style;
                    const widthMatch = style.width?.match(/(\d+(?:\.\d+)?)/);
                    const transformMatch = style.transform?.match(/translateX\((\d+(?:\.\d+)?)%?\)/);
                    
                    if (widthMatch) {
                        currentPercentage = parseFloat(widthMatch[1]);
                    } else if (transformMatch) {
                        currentPercentage = parseFloat(transformMatch[1]);
                    }
                }
                
                // Estimate duration and calculate new position
                const estimatedDuration = isFinite(video.duration) && video.duration > 0 ? video.duration : 2700; // Default 45min
                const currentTime = (currentPercentage / 100) * estimatedDuration;
                
                let newTime;
                if (direction === 'forward') {
                    newTime = Math.min(currentTime + amount, estimatedDuration);
                } else {
                    newTime = Math.max(currentTime - amount, 0);
                }
                
                const newPercentage = Math.max(0, Math.min(100, (newTime / estimatedDuration) * 100));
                const clickX = rect.left + (rect.width * newPercentage / 100);
                
                // Simulate click on seek bar
                const events = [
                    new MouseEvent('mousedown', {
                        bubbles: true,
                        clientX: clickX,
                        clientY: rect.top + rect.height / 2
                    }),
                    new MouseEvent('click', {
                        bubbles: true,
                        clientX: clickX,
                        clientY: rect.top + rect.height / 2
                    }),
                    new MouseEvent('mouseup', {
                        bubbles: true,
                        clientX: clickX,
                        clientY: rect.top + rect.height / 2
                    })
                ];
                
                events.forEach(event => seekBar.dispatchEvent(event));
                
                logger.debug(`Hulu fallback seek: clicked at ${newPercentage.toFixed(1)}% (${newTime.toFixed(1)}s)`);
                
                if (this.config && this.config.get('enableNotifications', true)) {
                    this.showSeekNotification(`${direction === 'forward' ? '+' : '-'}${amount}s`, newTime);
                }
                
                return true;
            }
            
            // Last resort: try setting currentTime if we have any reasonable value
            const currentTime = isFinite(video.currentTime) ? video.currentTime : 0;
            const newTime = direction === 'forward' 
                ? currentTime + amount 
                : Math.max(currentTime - amount, 0);
            
            if (isFinite(newTime) && newTime >= 0) {
                video.currentTime = newTime;
                logger.debug(`Hulu fallback: direct currentTime set to ${newTime.toFixed(2)}s`);
                
                if (this.config && this.config.get('enableNotifications', true)) {
                    this.showSeekNotification(`${direction === 'forward' ? '+' : '-'}${amount}s`, newTime);
                }
                return true;
            }
            
            logger.warn(`Hulu fallback: no viable seek method found`);
            return false;
            
        } catch (error) {
            logger.error('Hulu seek fallback failed:', error);
            return false;
        }
    }

    /**
     * Fallback percentage seek method for Hulu when metadata isn't available
     * @param {HTMLVideoElement} video - Video element
     * @param {number} percentage - Target percentage (0-100)
     * @returns {boolean} Success status
     */
    attemptHuluPercentageSeekFallback(video, percentage) {
        try {
            logger.debug(`Attempting Hulu percentage seek fallback: ${percentage}%`);
            
            // For Hulu, try to trigger seeking through their progress bar controls
            const seekBar = document.querySelector('.progress-bar, .scrubber-bar, [data-testid*="progress"], [data-testid*="scrubber"]');
            
            if (seekBar) {
                const rect = seekBar.getBoundingClientRect();
                const clickX = rect.left + (rect.width * percentage / 100);
                
                // Use more comprehensive mouse event sequence for better compatibility
                const events = [
                    new MouseEvent('mousedown', {
                        bubbles: true,
                        clientX: clickX,
                        clientY: rect.top + rect.height / 2
                    }),
                    new MouseEvent('click', {
                        bubbles: true,
                        clientX: clickX,
                        clientY: rect.top + rect.height / 2
                    }),
                    new MouseEvent('mouseup', {
                        bubbles: true,
                        clientX: clickX,
                        clientY: rect.top + rect.height / 2
                    })
                ];
                
                events.forEach(event => seekBar.dispatchEvent(event));
                
                logger.debug(`Hulu fallback percentage seek: clicked at ${percentage}%`);
                
                if (this.config && this.config.get('enableNotifications', true)) {
                    this.showSeekNotification(`${percentage}%`, 0);
                }
                
                return true;
            }
            
            // Last resort: estimate and set currentTime (with better estimation)
            const estimatedDuration = isFinite(video.duration) && video.duration > 0 ? video.duration : 2700; // Default 45min
            const newTime = (percentage / 100) * estimatedDuration;
            
            // Validate the calculated time before setting
            if (isFinite(newTime) && newTime >= 0 && newTime <= estimatedDuration) {
                video.currentTime = newTime;
                logger.debug(`Hulu fallback: estimated seek to ${newTime.toFixed(2)}s (${percentage}%)`);
                
                if (this.config && this.config.get('enableNotifications', true)) {
                    this.showSeekNotification(`${percentage}%`, newTime);
                }
                return true;
            } else {
                logger.warn(`Hulu fallback: invalid calculated time ${newTime} for percentage ${percentage}%`);
                return false;
            }
            
        } catch (error) {
            logger.error('Hulu percentage seek fallback failed:', error);
            return false;
        }
    }

    /**
     * Toggle play/pause
     */
    togglePlayPause() {
        if (!this.canControlPlayback()) return false;

        const video = this.currentPlayer.video;
        
        if (video.paused) {
            video.play().then(() => {
                logger.debug('Video played');
                if (this.config && this.config.get('enableNotifications', true)) {
                    this.showPlaybackNotification('Play');
                }
            }).catch(error => {
                logger.error('Failed to play video:', error);
            });
        } else {
            video.pause();
            logger.debug('Video paused');
            if (this.config && this.config.get('enableNotifications', true)) {
                this.showPlaybackNotification('Pause');
            }
        }
        
        return true;
    }

    /**
     * Show play/pause notification based on current state
     * (Used when platform handles play/pause but we want to show notification)
     */
    showPlayPauseNotification() {
        if (!this.canControlPlayback()) return false;
        if (!this.config || !this.config.get('enableNotifications', true)) return false;

        const video = this.currentPlayer.video;
        
        // Capture the CURRENT state before platform handles the action
        const wasPlaying = !video.paused;
        
        // Use a small delay to let platform handler complete first, then show action performed
        setTimeout(() => {
            if (wasPlaying) {
                // Video was playing, so space key paused it
                this.showPlaybackNotification('Pause');
            } else {
                // Video was paused, so space key played it
                this.showPlaybackNotification('Play');
            }
        }, 50); // Slightly longer delay to ensure platform state is updated
        
        return true;
    }

    /**
     * Increase volume
     * @param {number} step - Volume step (default: config value)
     */
    volumeUp(step = null) {
        if (step === null) {
            step = this.config ? this.config.get('volumeStep', 0.1) : 0.1;
        }
        if (!this.canControlVolume()) return false;

        const video = this.currentPlayer.video;
        const newVolume = Math.min(video.volume + step, 1);
        
        video.volume = newVolume;
        logger.debug(`Volume increased to ${(newVolume * 100).toFixed(0)}%`);
        
        if (this.config && this.config.get('enableNotifications', true)) {
            this.showVolumeNotification(newVolume);
        }
        
        return true;
    }

    /**
     * Decrease volume
     * @param {number} step - Volume step (default: config value)
     */
    volumeDown(step = null) {
        if (step === null) {
            step = this.config ? this.config.get('volumeStep', 0.1) : 0.1;
        }
        if (!this.canControlVolume()) return false;

        const video = this.currentPlayer.video;
        const newVolume = Math.max(video.volume - step, 0);
        
        video.volume = newVolume;
        logger.debug(`Volume decreased to ${(newVolume * 100).toFixed(0)}%`);
        
        if (this.config && this.config.get('enableNotifications', true)) {
            this.showVolumeNotification(newVolume);
        }
        
        return true;
    }

    /**
     * Toggle mute
     */
    toggleMute() {
        if (!this.canControlVolume()) return false;

        const video = this.currentPlayer.video;
        video.muted = !video.muted;
        
        logger.debug(`Video ${video.muted ? 'muted' : 'unmuted'}`);
        
        if (this.config && this.config.get('enableNotifications', true)) {
            this.showVolumeNotification(video.muted ? 0 : video.volume, video.muted);
        }
        
        return true;
    }

    /**
     * Toggle captions/subtitles
     */
    toggleCaptions() {
        if (!this.currentPlayer?.video) return false;

        const video = this.currentPlayer.video;
        const tracks = video.textTracks;
        
        if (tracks.length === 0) {
            // Try to find and click platform-specific captions button
            const captionsButton = this.findCaptionsButton();
            if (captionsButton) {
                captionsButton.click();
                logger.debug('Clicked platform captions button');
                if (this.config && this.config.get('enableNotifications', true)) {
                    window.SeekerNotification?.showInfo('Captions', 'Toggled via platform controls');
                }
                return true;
            }
            
            logger.debug('No caption tracks or button found');
            return false;
        }

        // Toggle HTML5 text tracks
        let hasVisibleTrack = false;
        for (let i = 0; i < tracks.length; i++) {
            if (tracks[i].mode === 'showing') {
                hasVisibleTrack = true;
                tracks[i].mode = 'disabled';
            }
        }

        if (!hasVisibleTrack && tracks.length > 0) {
            // Enable the first available track
            tracks[0].mode = 'showing';
            logger.debug('Enabled captions');
            if (this.config && this.config.get('enableNotifications', true)) {
                window.SeekerNotification?.showInfo('Captions', 'Enabled');
            }
        } else {
            logger.debug('Disabled captions');
            if (this.config && this.config.get('enableNotifications', true)) {
                window.SeekerNotification?.showInfo('Captions', 'Disabled');
            }
        }

        return true;
    }

    /**
     * Find platform-specific captions button
     * @returns {Element|null} Captions button element
     */
    findCaptionsButton() {
        const selectors = [
            '[aria-label*="caption" i]',
            '[aria-label*="subtitle" i]',
            '.captions',
            '.subtitles',
            '[class*="caption" i]',
            '[class*="subtitle" i]',
            '[title*="caption" i]',
            '[title*="subtitle" i]'
        ];

        for (const selector of selectors) {
            const button = document.querySelector(selector);
            if (button && button.offsetParent !== null) { // visible element
                return button;
            }
        }

        return null;
    }

    /**
     * Toggle fullscreen
     */
    toggleFullscreen() {
        if (!this.currentPlayer) return false;

        try {
            if (DOMUtils.isFullscreen()) {
                document.exitFullscreen();
                logger.debug('Exited fullscreen');
            } else {
                const element = this.currentPlayer.container || this.currentPlayer.video;
                element.requestFullscreen();
                logger.debug('Entered fullscreen');
            }
            return true;
        } catch (error) {
            logger.error('Failed to toggle fullscreen:', error);
            return false;
        }
    }

    /**
     * Skip to next chapter/segment (platform-specific)
     */
    skipForward() {
        // Try platform-specific skip first
        if (this.currentPlayer?.controls?.nextButton) {
            this.currentPlayer.controls.nextButton.click();
            return true;
        }
        
        // Fallback to large seek
        return this.seekForward(30);
    }

    /**
     * Skip to previous chapter/segment (platform-specific)
     */
    skipBackward() {
        // Try platform-specific skip first
        if (this.currentPlayer?.controls?.prevButton) {
            this.currentPlayer.controls.prevButton.click();
            return true;
        }
        
        // Fallback to large seek
        return this.seekBackward(30);
    }

    /**
     * Check if seeking is available
     * @returns {boolean} Whether seeking is available
     */
    canSeek() {
        return this.currentPlayer && 
               this.currentPlayer.video && 
               this.currentPlayer.video.duration > 0 &&
               !isNaN(this.currentPlayer.video.duration);
    }

    /**
     * Check if playback control is available
     * @returns {boolean} Whether playback control is available
     */
    canControlPlayback() {
        return this.currentPlayer && 
               this.currentPlayer.video && 
               (this.config ? this.config.get('enablePlaybackControl', true) : true);
    }

    /**
     * Check if volume control is available
     * @returns {boolean} Whether volume control is available
     */
    canControlVolume() {
        return this.currentPlayer && 
               this.currentPlayer.video && 
               (this.config ? this.config.get('enableVolumeControl', true) : true);
    }

    /**
     * Show seek notification
     * @param {string} action - Action description
     * @param {number} currentTime - Current video time
     */
    showSeekNotification(action, currentTime) {
        if (!window.SeekerNotification || !this.config || !this.config.get('enableNotifications', true)) return;
        
        const duration = this.currentPlayer.video.duration;
        
        // Handle cases where duration or currentTime aren't available
        if (!isFinite(duration) || duration <= 0 || !isFinite(currentTime)) {
            // For Hulu fallback cases, show simpler notification
            window.SeekerNotification.show(
                `${action}`,
                'Seeking...',
                'seek'
            );
            return;
        }
        
        const percentage = ((currentTime / duration) * 100).toFixed(1);
        const timeStr = this.formatTime(currentTime);
        const durationStr = this.formatTime(duration);
        
        window.SeekerNotification.show(
            `${action}`,
            `${timeStr} / ${durationStr} (${percentage}%)`,
            'seek'
        );
    }

    /**
     * Show playback notification
     * @param {string} action - Action description
     */
    showPlaybackNotification(action) {
        if (!window.SeekerNotification || !this.config || !this.config.get('enableNotifications', true)) return;
        
        window.SeekerNotification.showPlaybackNotification(action);
    }

    /**
     * Show volume notification
     * @param {number} volume - Volume level (0-1)
     * @param {boolean} muted - Whether muted
     */
    showVolumeNotification(volume, muted = false) {
        if (!window.SeekerNotification || !this.config || !this.config.get('enableNotifications', true)) return;
        
        const volumePercent = Math.round(volume * 100);
        const message = muted ? 'Muted' : `${volumePercent}%`;
        
        window.SeekerNotification.show('Volume', message, 'volume');
    }

    /**
     * Format time in MM:SS or HH:MM:SS format
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time string
     */
    formatTime(seconds) {
        if (!isFinite(seconds) || seconds < 0) return '00:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }

    /**
     * Get current player status
     * @returns {Object} Player status information
     */
    getStatus() {
        if (!this.currentPlayer) {
            return { connected: false };
        }

        const video = this.currentPlayer.video;
        return {
            connected: true,
            platform: this.currentPlayer.platform,
            playing: !video.paused,
            currentTime: video.currentTime,
            duration: video.duration,
            volume: video.volume,
            muted: video.muted,
            canSeek: this.canSeek(),
            canControlPlayback: this.canControlPlayback(),
            canControlVolume: this.canControlVolume()
        };
    }

    /**
     * Update settings
     * @param {Object} newSettings - New settings to merge
     */
    updateSettings(newSettings) {
        if (this.config) {
            this.config.updateSettings(newSettings);
        }
    }

    /**
     * Get current settings
     * @returns {Object} Current settings
     */
    getSettings() {
        return this.config ? this.config.getSettings() : {};
    }
}
