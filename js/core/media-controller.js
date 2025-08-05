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
     * Seek forward by specified amount
     * @param {number} amount - Seconds to seek forward (default: config value)
     */
    seekForward(amount = null) {
        if (amount === null) {
            amount = this.config ? this.config.getSeekAmounts().arrow : 5;
        }
        if (!this.canSeek()) return false;

        const video = this.currentPlayer.video;
        const newTime = Math.min(video.currentTime + amount, video.duration);
        
        video.currentTime = newTime;
        logger.debug(`Seeked forward ${amount}s to ${newTime.toFixed(2)}s`);
        
        if (this.config && this.config.get('enableNotifications', true)) {
            this.showSeekNotification(`+${amount}s`, newTime);
        }
        
        return true;
    }

    /**
     * Seek backward by specified amount
     * @param {number} amount - Seconds to seek backward (default: config value)
     */
    seekBackward(amount = null) {
        if (amount === null) {
            amount = this.config ? this.config.getSeekAmounts().arrow : 5;
        }
        if (!this.canSeek()) return false;

        const video = this.currentPlayer.video;
        const newTime = Math.max(video.currentTime - amount, 0);
        
        video.currentTime = newTime;
        logger.debug(`Seeked backward ${amount}s to ${newTime.toFixed(2)}s`);
        
        if (this.config && this.config.get('enableNotifications', true)) {
            this.showSeekNotification(`-${amount}s`, newTime);
        }
        
        return true;
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
    seekToPercentage(percentage) {
        if (!this.canSeek()) return false;

        const video = this.currentPlayer.video;
        const newTime = (percentage / 100) * video.duration;
        
        video.currentTime = newTime;
        logger.debug(`Seeked to ${percentage}% (${newTime.toFixed(2)}s)`);
        
        if (this.config && this.config.get('enableNotifications', true)) {
            this.showSeekNotification(`${percentage}%`, newTime);
        }
        
        return true;
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
        if (!window.SeekerNotification) return;
        
        const duration = this.currentPlayer.video.duration;
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
        if (!window.SeekerNotification) return;
        
        window.SeekerNotification.showPlaybackNotification(action);
    }

    /**
     * Show volume notification
     * @param {number} volume - Volume level (0-1)
     * @param {boolean} muted - Whether muted
     */
    showVolumeNotification(volume, muted = false) {
        if (!window.SeekerNotification) return;
        
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
        if (isNaN(seconds)) return '00:00';
        
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
