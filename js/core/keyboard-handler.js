/**
 * Keyboard Handler
 * Manages keyboard shortcuts and prevents conflicts with platform controls
 */
class KeyboardHandler {
    constructor(mediaController) {
        this.mediaController = mediaController;
        this.config = window.SeekerConfig;
        this.isEnabled = true;
        this.keyMappings = new Map();
        this.pressedKeys = new Set();
        this.lastKeyTime = 0;
        this.keyRepeatDelay = 150; // ms
        
        this.initializeKeyMappings();
        this.bindEvents();
    }

    /**
     * Initialize default key mappings
     */
    initializeKeyMappings() {
        // Primary controls - Arrow keys for seeking (configurable, default 5s)
        this.keyMappings.set('ArrowLeft', { 
            action: 'seekBackward', 
            description: 'Seek backward 5s',
            category: 'seeking'
        });
        this.keyMappings.set('ArrowRight', { 
            action: 'seekForward', 
            description: 'Seek forward 5s',
            category: 'seeking'
        });

        // Volume controls - Up/Down arrows
        this.keyMappings.set('ArrowUp', { 
            action: 'volumeUp', 
            description: 'Volume up',
            category: 'volume'
        });
        this.keyMappings.set('ArrowDown', { 
            action: 'volumeDown', 
            description: 'Volume down',
            category: 'volume'
        });

        // Play/Pause controls - Space and K
        this.keyMappings.set(' ', { 
            action: 'togglePlayPause', 
            description: 'Play/Pause',
            category: 'playback',
            preventDefault: true
        });
        this.keyMappings.set('KeyK', { 
            action: 'togglePlayPause', 
            description: 'Play/Pause (K)',
            category: 'playback'
        });

        // Extended seeking - J/L (always double the arrow amount)
        this.keyMappings.set('KeyJ', { 
            action: 'seekBackwardExtended', 
            description: 'Seek backward (double arrow time)',
            category: 'seeking'
        });
        this.keyMappings.set('KeyL', { 
            action: 'seekForwardExtended', 
            description: 'Seek forward (double arrow time)',
            category: 'seeking'
        });

        // Mute control
        this.keyMappings.set('KeyM', { 
            action: 'toggleMute', 
            description: 'Mute/Unmute',
            category: 'volume'
        });

        // Captions control
        this.keyMappings.set('KeyC', { 
            action: 'toggleCaptions', 
            description: 'Toggle captions',
            category: 'display'
        });

        // Fullscreen control (F to enter, F again to exit)
        this.keyMappings.set('KeyF', { 
            action: 'toggleFullscreen', 
            description: 'Toggle fullscreen',
            category: 'display'
        });

        // Number keys for percentage seeking
        for (let i = 0; i <= 9; i++) {
            this.keyMappings.set(`Digit${i}`, {
                action: 'seekToPercentage',
                params: [i * 10],
                description: `Seek to ${i * 10}%`,
                category: 'seeking'
            });
        }
    }

    /**
     * Bind keyboard events
     */
    bindEvents() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this), true);
        document.addEventListener('keyup', this.handleKeyUp.bind(this), true);
        
        // Prevent conflicts with platform shortcuts
        document.addEventListener('keydown', this.preventPlatformConflicts.bind(this), false);
    }

    /**
     * Handle keydown events
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyDown(event) {
        if (!this.isEnabled || !this.shouldHandleKey(event)) {
            return;
        }

        const key = this.getKeyIdentifier(event);
        const mapping = this.keyMappings.get(key);
        
        if (!mapping) return;

        // Prevent key repeat spam
        const now = Date.now();
        if (this.pressedKeys.has(key) && (now - this.lastKeyTime) < this.keyRepeatDelay) {
            return;
        }

        this.pressedKeys.add(key);
        this.lastKeyTime = now;

        // Execute the mapped action
        this.executeAction(mapping, event);
        
        logger.debug(`Executed action: ${mapping.action} for key: ${key}`);
    }

    /**
     * Handle keyup events
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyUp(event) {
        const key = this.getKeyIdentifier(event);
        this.pressedKeys.delete(key);
    }

    /**
     * Prevent conflicts with platform-specific keyboard shortcuts
     * @param {KeyboardEvent} event - Keyboard event
     */
    preventPlatformConflicts(event) {
        if (!this.isEnabled || !this.shouldHandleKey(event)) {
            return;
        }

        const key = this.getKeyIdentifier(event);
        const mapping = this.keyMappings.get(key);
        
        if (mapping && mapping.preventDefault) {
            event.preventDefault();
            event.stopPropagation();
        }

        // Platform-specific conflict prevention
        const hostname = DOMUtils.getHostname();
        
        if (hostname.includes('paramountplus.com')) {
            this.preventParamountConflicts(event, key);
        }
    }

    /**
     * Prevent Paramount+ specific conflicts
     * @param {KeyboardEvent} event - Keyboard event
     * @param {string} key - Key identifier
     */
    preventParamountConflicts(event, key) {
        // Paramount+ specific keys that need conflict prevention
        const paramountKeys = [' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyJ', 'KeyL', 'KeyK', 'KeyM', 'KeyF', 'KeyC'];
        
        if (paramountKeys.includes(key) && this.keyMappings.has(key)) {
            event.preventDefault();
            event.stopPropagation();
            logger.debug(`Prevented Paramount+ conflict for key: ${key}`);
            
            // Special handling for Space key to prevent page scroll
            if (key === ' ') {
                event.stopImmediatePropagation();
                
                // Additional prevention for Paramount+ page scroll
                const activeElement = document.activeElement;
                if (activeElement && activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                    // Temporarily blur any focused element that might capture space
                    if (activeElement.blur && typeof activeElement.blur === 'function') {
                        activeElement.blur();
                    }
                }
            }
        }
    }

    /**
     * Check if key should be handled
     * @param {KeyboardEvent} event - Keyboard event
     * @returns {boolean} Whether to handle the key
     */
    shouldHandleKey(event) {
        // Don't handle if modifier keys are pressed (except Shift for some keys)
        if (event.ctrlKey || event.altKey || event.metaKey) {
            return false;
        }

        // Don't handle if focus is on input elements
        const activeElement = document.activeElement;
        if (activeElement && this.isInputElement(activeElement)) {
            return false;
        }

        // Don't handle if not on a video page
        if (!this.mediaController.currentPlayer) {
            return false;
        }

        return true;
    }

    /**
     * Check if element is an input element
     * @param {Element} element - Element to check
     * @returns {boolean} Whether element is input
     */
    isInputElement(element) {
        const inputTypes = ['input', 'textarea', 'select'];
        const tagName = element.tagName.toLowerCase();
        
        if (inputTypes.includes(tagName)) {
            return true;
        }

        // Check for contenteditable
        if (element.contentEditable === 'true') {
            return true;
        }

        // Check for role="textbox"
        if (element.getAttribute('role') === 'textbox') {
            return true;
        }

        return false;
    }

    /**
     * Get key identifier from event
     * @param {KeyboardEvent} event - Keyboard event
     * @returns {string} Key identifier
     */
    getKeyIdentifier(event) {
        // Use event.code for better consistency across layouts
        if (event.code) {
            return event.code;
        }
        
        // Fallback to key for special keys
        return event.key;
    }

    /**
     * Execute mapped action
     * @param {Object} mapping - Key mapping object
     * @param {KeyboardEvent} event - Keyboard event
     */
    executeAction(mapping, event) {
        try {
            const action = mapping.action;
            const params = mapping.params || [];
            
            if (typeof this.mediaController[action] === 'function') {
                const result = this.mediaController[action](...params);
                
                if (result) {
                    // Action was successful, prevent default behavior
                    event.preventDefault();
                    event.stopPropagation();
                }
            } else {
                logger.warn(`Unknown action: ${action}`);
            }
        } catch (error) {
            logger.error(`Error executing action ${mapping.action}:`, error);
        }
    }

    /**
     * Enable keyboard handling
     */
    enable() {
        this.isEnabled = true;
        logger.debug('Keyboard handler enabled');
    }

    /**
     * Disable keyboard handling
     */
    disable() {
        this.isEnabled = false;
        this.pressedKeys.clear();
        logger.debug('Keyboard handler disabled');
    }

    /**
     * Check if keyboard handling is enabled
     * @returns {boolean} Whether enabled
     */
    isKeyboardEnabled() {
        return this.isEnabled;
    }

    /**
     * Set keyboard handling enabled/disabled state
     * @param {boolean} enabled - Whether to enable keyboard handling
     */
    setEnabled(enabled) {
        if (enabled) {
            this.enable();
        } else {
            this.disable();
        }
    }

    /**
     * Add custom key mapping
     * @param {string} key - Key identifier
     * @param {Object} mapping - Mapping configuration
     */
    addKeyMapping(key, mapping) {
        this.keyMappings.set(key, mapping);
        logger.debug(`Added key mapping: ${key} -> ${mapping.action}`);
    }

    /**
     * Remove key mapping
     * @param {string} key - Key identifier
     */
    removeKeyMapping(key) {
        this.keyMappings.delete(key);
        logger.debug(`Removed key mapping: ${key}`);
    }

    /**
     * Get all key mappings
     * @returns {Map} Key mappings
     */
    getKeyMappings() {
        return new Map(this.keyMappings);
    }

    /**
     * Get key mappings by category
     * @param {string} category - Category name
     * @returns {Map} Filtered key mappings
     */
    getKeyMappingsByCategory(category) {
        const filtered = new Map();
        
        for (const [key, mapping] of this.keyMappings) {
            if (mapping.category === category) {
                filtered.set(key, mapping);
            }
        }
        
        return filtered;
    }

    /**
     * Get current seek amounts for display purposes
     * @returns {Object} Current seek amounts
     */
    getSeekAmounts() {
        return this.config ? this.config.getSeekAmounts() : { arrow: 5, extended: 10, large: 30 };
    }
}
