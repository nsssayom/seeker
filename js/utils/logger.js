/**
 * Logger utility for the Seeker extension
 * Provides consistent logging with prefix and development/production modes
 */
class SeekerLogger {
    constructor() {
        this.prefix = '[Seeker]';
        this.isDev = true; // Set to false for production
        this.logLevel = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
        this.currentLevel = this.isDev ? this.logLevel.DEBUG : this.logLevel.INFO;
    }

    /**
     * Log error messages
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments
     */
    error(message, ...args) {
        if (this.currentLevel >= this.logLevel.ERROR) {
            console.error(`${this.prefix} [ERROR]`, message, ...args);
        }
    }

    /**
     * Log warning messages
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments
     */
    warn(message, ...args) {
        if (this.currentLevel >= this.logLevel.WARN) {
            console.warn(`${this.prefix} [WARN]`, message, ...args);
        }
    }

    /**
     * Log info messages
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments
     */
    info(message, ...args) {
        if (this.currentLevel >= this.logLevel.INFO) {
            console.info(`${this.prefix} [INFO]`, message, ...args);
        }
    }

    /**
     * Log debug messages
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments
     */
    debug(message, ...args) {
        if (this.currentLevel >= this.logLevel.DEBUG) {
            console.log(`${this.prefix} [DEBUG]`, message, ...args);
        }
    }

    /**
     * Log platform-specific messages
     * @param {string} platform - The platform name
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments
     */
    platform(platform, message, ...args) {
        this.debug(`[${platform.toUpperCase()}]`, message, ...args);
    }
}

// Create global logger instance
const logger = new SeekerLogger();
