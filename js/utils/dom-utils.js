/**
 * DOM utility functions for the Seeker extension
 * Provides helper methods for DOM manipulation and element detection
 */
class DOMUtils {
    /**
     * Wait for an element to appear in the DOM
     * @param {string} selector - CSS selector for the element
     * @param {number} timeout - Maximum time to wait in milliseconds
     * @param {Element} context - Context element to search within (default: document)
     * @returns {Promise<Element>} Promise that resolves with the element
     */
    static waitForElement(selector, timeout = 5000, context = document) {
        return new Promise((resolve, reject) => {
            const element = context.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
                const element = context.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });

            observer.observe(context, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    }

    /**
     * Wait for multiple elements to appear in the DOM
     * @param {string[]} selectors - Array of CSS selectors
     * @param {number} timeout - Maximum time to wait in milliseconds
     * @param {Element} context - Context element to search within
     * @returns {Promise<Element[]>} Promise that resolves with array of elements
     */
    static waitForElements(selectors, timeout = 5000, context = document) {
        return Promise.all(
            selectors.map(selector => this.waitForElement(selector, timeout, context))
        );
    }

    /**
     * Check if an element is visible in the viewport
     * @param {Element} element - The element to check
     * @returns {boolean} Whether the element is visible
     */
    static isElementVisible(element) {
        if (!element || !element.offsetParent) return false;
        
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    /**
     * Find video elements in the DOM
     * @param {Element} context - Context element to search within
     * @returns {HTMLVideoElement[]} Array of video elements
     */
    static findVideoElements(context = document) {
        return Array.from(context.querySelectorAll('video'));
    }

    /**
     * Find the primary video element (largest and playing)
     * @param {Element} context - Context element to search within
     * @returns {HTMLVideoElement|null} The primary video element
     */
    static findPrimaryVideoElement(context = document) {
        const videos = this.findVideoElements(context);
        if (videos.length === 0) return null;
        if (videos.length === 1) return videos[0];

        // Find the largest video element that's not muted
        return videos.reduce((primary, video) => {
            const rect = video.getBoundingClientRect();
            const area = rect.width * rect.height;
            
            if (!primary) return video;
            
            const primaryRect = primary.getBoundingClientRect();
            const primaryArea = primaryRect.width * primaryRect.height;
            
            // Prefer larger, unmuted, and playing videos
            if (area > primaryArea && !video.muted && !video.paused) {
                return video;
            }
            
            return primary;
        }, null);
    }

    /**
     * Create a debounced function
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    static debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Create a throttled function
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    static throttle(func, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Add CSS styles to the document
     * @param {string} css - CSS string to add
     * @param {string} id - Optional ID for the style element
     */
    static addCSS(css, id = null) {
        const style = document.createElement('style');
        style.textContent = css;
        if (id) style.id = id;
        document.head.appendChild(style);
    }

    /**
     * Check if the current page is in fullscreen mode
     * @returns {boolean} Whether page is in fullscreen
     */
    static isFullscreen() {
        return !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );
    }

    /**
     * Get the hostname of the current page
     * @returns {string} The hostname
     */
    static getHostname() {
        return window.location.hostname;
    }

    /**
     * Check if an element matches any of the provided selectors
     * @param {Element} element - Element to check
     * @param {string[]} selectors - Array of CSS selectors
     * @returns {boolean} Whether element matches any selector
     */
    static matchesAny(element, selectors) {
        return selectors.some(selector => {
            try {
                return element.matches(selector);
            } catch (e) {
                return false;
            }
        });
    }

    /**
     * Deep clone an object
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     */
    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
}
