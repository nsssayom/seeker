/**
 * Notification System
 * Displays temporary notifications for user feedback
 */
class SeekerNotification {
    constructor() {
        this.container = null;
        this.currentNotification = null;
        this.hideTimeout = null;
        this.isEnabled = true; // Default to true, will be updated from config
        
        this.createContainer();
        this.setupStyles();
        
        // Initialize from config will be called by main.js after config is loaded
    }
    
    /**
     * Initialize notification state from config
     */
    async initializeFromConfig() {
        // Config should already be loaded when this is called
        if (!window.SeekerConfig || !window.SeekerConfig.loaded) {
            logger.warn('SeekerConfig not available or not loaded yet');
            return;
        }
        
        // Set initial state from config
        const notificationsEnabled = window.SeekerConfig.get('enableNotifications', true);
        if (notificationsEnabled) {
            this.enable();
        } else {
            this.disable();
        }
        
        logger.debug(`Notifications initialized from config: ${notificationsEnabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Create notification container
     */
    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'seeker-notification-container';
        this.container.className = 'seeker-notification-container';
        
        document.body.appendChild(this.container);
    }

    /**
     * Setup notification styles
     */
    setupStyles() {
        const styles = `
            .seeker-notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 999999;
                pointer-events: none;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .seeker-notification {
                background: rgba(0, 0, 0, 0.85);
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                margin-bottom: 8px;
                min-width: 200px;
                max-width: 350px;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                font-size: 14px;
                line-height: 1.4;
            }
            
            .seeker-notification.show {
                transform: translateX(0);
                opacity: 1;
            }
            
            .seeker-notification.hide {
                transform: translateX(100%);
                opacity: 0;
            }
            
            .seeker-notification-title {
                font-weight: 600;
                margin-bottom: 4px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .seeker-notification-message {
                font-weight: 400;
                opacity: 0.9;
            }
            
            .seeker-notification-icon {
                width: 16px;
                height: 16px;
                flex-shrink: 0;
            }
            
            .seeker-notification.seek {
                border-left: 3px solid #007AFF;
            }
            
            .seeker-notification.volume {
                border-left: 3px solid #FF9500;
            }
            
            .seeker-notification.playback,
            .seeker-notification.play,
            .seeker-notification.pause {
                border-left: 3px solid #34C759;
            }
            
            .seeker-notification.error {
                border-left: 3px solid #FF3B30;
            }
            
            .seeker-notification.info {
                border-left: 3px solid #5AC8FA;
            }
            
            @media (max-width: 480px) {
                .seeker-notification-container {
                    top: 10px;
                    right: 10px;
                    left: 10px;
                }
                
                .seeker-notification {
                    margin-bottom: 6px;
                    padding: 10px 12px;
                    font-size: 13px;
                }
            }
        `;
        
        DOMUtils.addCSS(styles, 'seeker-notification-styles');
    }

    /**
     * Show notification
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {string} type - Notification type (seek, volume, playback, error, info)
     * @param {number} duration - Duration to show in milliseconds
     */
    show(title, message = '', type = 'info', duration = 2000) {
        if (!this.isEnabled) return;

        // Clear existing notification and timeout
        this.clear();

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `seeker-notification ${type}`;
        
        // Create title with icon
        const titleElement = document.createElement('div');
        titleElement.className = 'seeker-notification-title';
        
        const icon = this.getIcon(type);
        if (icon) {
            const iconElement = document.createElement('div');
            iconElement.className = 'seeker-notification-icon';
            iconElement.innerHTML = icon;
            titleElement.appendChild(iconElement);
        }
        
        const titleText = document.createElement('span');
        titleText.textContent = title;
        titleElement.appendChild(titleText);
        
        notification.appendChild(titleElement);
        
        // Add message if provided
        if (message) {
            const messageElement = document.createElement('div');
            messageElement.className = 'seeker-notification-message';
            messageElement.textContent = message;
            notification.appendChild(messageElement);
        }
        
        // Add to container
        this.container.appendChild(notification);
        this.currentNotification = notification;
        
        // Trigger animation
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // Auto-hide after duration
        this.hideTimeout = setTimeout(() => {
            this.hide();
        }, duration);
        
        logger.debug(`Notification shown: ${title} - ${message}`);
    }

    /**
     * Get icon SVG for notification type
     * @param {string} type - Notification type
     * @returns {string} SVG icon
     */
    getIcon(type) {
        const icons = {
            seek: `<svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6l5.25 3.15-.75 1.23L11 15V7z"/>
            </svg>`,
            volume: `<svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>`,
            play: `<svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
            </svg>`,
            pause: `<svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>`,
            playback: `<svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
            </svg>`,
            error: `<svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>`,
            info: `<svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>`
        };
        
        return icons[type] || icons.info;
    }

    /**
     * Hide current notification
     */
    hide() {
        if (!this.currentNotification) return;
        
        this.currentNotification.classList.remove('show');
        this.currentNotification.classList.add('hide');
        
        setTimeout(() => {
            if (this.currentNotification) {
                this.currentNotification.remove();
                this.currentNotification = null;
            }
        }, 300);
        
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
        
        logger.debug('Notification hidden');
    }

    /**
     * Clear all notifications
     */
    clear() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
        
        if (this.currentNotification) {
            this.currentNotification.remove();
            this.currentNotification = null;
        }
    }

    /**
     * Show seek notification with progress bar
     * @param {string} action - Seek action (e.g., "+10s", "-10s")
     * @param {number} currentTime - Current video time
     * @param {number} duration - Total video duration
     */
    showSeekNotification(action, currentTime, duration) {
        // Handle cases where duration or currentTime aren't available
        if (!isFinite(duration) || duration <= 0 || !isFinite(currentTime)) {
            this.show(
                `Seek ${action}`,
                'Seeking...',
                'seek',
                1500
            );
            return;
        }
        
        const percentage = ((currentTime / duration) * 100).toFixed(1);
        const timeStr = this.formatTime(currentTime);
        const durationStr = this.formatTime(duration);
        
        this.show(
            `Seek ${action}`,
            `${timeStr} / ${durationStr} (${percentage}%)`,
            'seek',
            1500
        );
    }

    /**
     * Show volume notification with visual indicator
     * @param {number} volume - Volume level (0-1)
     * @param {boolean} muted - Whether muted
     */
    showVolumeNotification(volume, muted = false) {
        const volumePercent = Math.round(volume * 100);
        const volumeBars = '█'.repeat(Math.ceil(volumePercent / 10));
        const message = muted ? 'Muted' : `${volumePercent}% ${volumeBars}`;
        
        this.show('Volume', message, 'volume', 1000);
    }

    /**
     * Show playback notification
     * @param {string} action - Playback action (Play, Pause, etc.)
     */
    showPlaybackNotification(action) {
        // Use specific type for play/pause to get correct icons
        const type = action.toLowerCase() === 'play' ? 'play' : 
                     action.toLowerCase() === 'pause' ? 'pause' : 'playback';
        this.show(action, '', type, 800);
    }

    /**
     * Show error notification
     * @param {string} title - Error title
     * @param {string} message - Error message
     */
    showError(title, message = '') {
        this.show(title, message, 'error', 3000);
    }

    /**
     * Show info notification
     * @param {string} title - Info title
     * @param {string} message - Info message
     */
    showInfo(title, message = '') {
        this.show(title, message, 'info', 2000);
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
     * Enable notifications
     */
    enable() {
        this.isEnabled = true;
        logger.debug('Notifications enabled');
    }

    /**
     * Disable notifications
     */
    disable() {
        this.isEnabled = false;
        this.clear();
        logger.debug('Notifications disabled');
    }

    /**
     * Check if notifications are enabled
     * @returns {boolean} Whether notifications are enabled
     */
    isNotificationsEnabled() {
        return this.isEnabled;
    }

    /**
     * Destroy notification system
     */
    destroy() {
        this.clear();
        
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        
        // Remove styles
        const styles = document.getElementById('seeker-notification-styles');
        if (styles) {
            styles.remove();
        }
        
        logger.debug('Notification system destroyed');
    }
}

// Create global instance
window.SeekerNotification = new SeekerNotification();
