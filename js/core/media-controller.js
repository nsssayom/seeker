/**
 * Media Controller
 * Handles media playback control operations
 */
class MediaController {
    constructor() {
        this.currentPlayer = null;
        this.settings = {
            seekAmount: 10, // seconds
            volumeStep: 0.1, // 10%
            enableNotifications: true,
            enableVolumeControl: true,
            enablePlaybackControl: true,
            enableSeekPreview: false
        };
        
        this.loadSettings();
    }

    /**
     * Load settings from storage
     */
    async loadSettings() {
        try {
            const stored = await chrome.storage.sync.get('seekerSettings');
            if (stored.seekerSettings) {
                this.settings = { ...this.settings, ...stored.seekerSettings };
                logger.debug('Settings loaded:', this.settings);
            }
        } catch (error) {
            logger.warn('Could not load settings:', error);
        }
    }

    /**
     * Save settings to storage
     */
    async saveSettings() {
        try {
            await chrome.storage.sync.set({ seekerSettings: this.settings });
            logger.debug('Settings saved:', this.settings);
        } catch (error) {
            logger.warn('Could not save settings:', error);
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
     * @param {number} amount - Seconds to seek forward (default: setting value)
     */
    seekForward(amount = this.settings.seekAmount) {
        if (!this.canSeek()) return false;

        const video = this.currentPlayer.video;
        const newTime = Math.min(video.currentTime + amount, video.duration);
        
        video.currentTime = newTime;
        logger.debug(`Seeked forward ${amount}s to ${newTime.toFixed(2)}s`);
        
        if (this.settings.enableNotifications) {
            this.showSeekNotification(`+${amount}s`, newTime);
        }
        
        return true;
    }

    /**
     * Seek backward by specified amount
     * @param {number} amount - Seconds to seek backward (default: setting value)
     */
    seekBackward(amount = this.settings.seekAmount) {
        if (!this.canSeek()) return false;

        const video = this.currentPlayer.video;
        const newTime = Math.max(video.currentTime - amount, 0);
        
        video.currentTime = newTime;
        logger.debug(`Seeked backward ${amount}s to ${newTime.toFixed(2)}s`);
        
        if (this.settings.enableNotifications) {
            this.showSeekNotification(`-${amount}s`, newTime);
        }
        
        return true;
    }

    /**
     * Seek forward by extended amount (2x the normal seek amount)
     */
    seekForwardExtended() {
        return this.seekForward(this.settings.seekAmount * 2);
    }

    /**
     * Seek backward by extended amount (2x the normal seek amount)
     */
    seekBackwardExtended() {
        return this.seekBackward(this.settings.seekAmount * 2);
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
        
        if (this.settings.enableNotifications) {
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
                if (this.settings.enableNotifications) {
                    this.showPlaybackNotification('Play');
                }
            }).catch(error => {
                logger.error('Failed to play video:', error);
            });
        } else {
            video.pause();
            logger.debug('Video paused');
            if (this.settings.enableNotifications) {
                this.showPlaybackNotification('Pause');
            }
        }
        
        return true;
    }

    /**
     * Increase volume
     * @param {number} step - Volume step (default: setting value)
     */
    volumeUp(step = this.settings.volumeStep) {
        if (!this.canControlVolume()) return false;

        const video = this.currentPlayer.video;
        const newVolume = Math.min(video.volume + step, 1);
        
        video.volume = newVolume;
        logger.debug(`Volume increased to ${(newVolume * 100).toFixed(0)}%`);
        
        if (this.settings.enableNotifications) {
            this.showVolumeNotification(newVolume);
        }
        
        return true;
    }

    /**
     * Decrease volume
     * @param {number} step - Volume step (default: setting value)
     */
    volumeDown(step = this.settings.volumeStep) {
        if (!this.canControlVolume()) return false;

        const video = this.currentPlayer.video;
        const newVolume = Math.max(video.volume - step, 0);
        
        video.volume = newVolume;
        logger.debug(`Volume decreased to ${(newVolume * 100).toFixed(0)}%`);
        
        if (this.settings.enableNotifications) {
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
        
        if (this.settings.enableNotifications) {
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
                if (this.settings.enableNotifications) {
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
            if (this.settings.enableNotifications) {
                window.SeekerNotification?.showInfo('Captions', 'Enabled');
            }
        } else {
            logger.debug('Disabled captions');
            if (this.settings.enableNotifications) {
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
               this.settings.enablePlaybackControl;
    }

    /**
     * Check if volume control is available
     * @returns {boolean} Whether volume control is available
     */
    canControlVolume() {
        return this.currentPlayer && 
               this.currentPlayer.video && 
               this.settings.enableVolumeControl;
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
        
        window.SeekerNotification.show(action, '', 'playback');
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
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
    }

    /**
     * Get current settings
     * @returns {Object} Current settings
     */
    getSettings() {
        return { ...this.settings };
    }
}
