/**
 * Settings Overlay
 * Provides in-page settings interface for the extension
 */
class SettingsOverlay {
    constructor(mediaController, keyboardHandler) {
        this.mediaController = mediaController;
        this.keyboardHandler = keyboardHandler;
        this.config = window.SeekerConfig;
        this.overlay = null;
        this.isVisible = false;
        this.platformUpdateInterval = null;
        
        // Ensure dependencies are available
        if (!this.mediaController) {
            logger.error('SettingsOverlay: mediaController is required');
            return;
        }
        
        if (!this.keyboardHandler) {
            logger.error('SettingsOverlay: keyboardHandler is required');
            return;
        }
        
        this.createOverlay();
        this.setupStyles();
        this.setupEventListeners();
        this.initializeSettings();
    }

    /**
     * Create settings overlay
     */
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'seeker-settings-overlay';
        this.overlay.className = 'seeker-settings-overlay';
        this.overlay.innerHTML = this.getOverlayHTML();
        
        // Apply dark mode class based on system preference
        this.applyTheme();
        
        document.body.appendChild(this.overlay);
    }

    /**
     * Get overlay HTML structure
     * @returns {string} HTML string
     */
    getOverlayHTML() {
        return `
            <div class="seeker-settings-backdrop"></div>
            <div class="seeker-settings-panel">
                <div class="seeker-settings-header">
                    <h2>Seeker Settings</h2>
                    <button class="seeker-settings-close" aria-label="Close settings">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>
                
                <div class="seeker-settings-content">
                    <div class="seeker-settings-section">
                        <h3>
                            <svg class="section-icon" viewBox="0 0 24 24" width="18" height="18">
                                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                            Seeking
                        </h3>
                        <div class="seeker-setting-row">
                            <div class="setting-info">
                                <label for="seek-amount">Seek Amount</label>
                                <span class="setting-desc">Seconds to skip per arrow key press</span>
                            </div>
                            <div class="number-input-container">
                                <input type="number" id="seek-amount" min="1" max="60" value="5">
                                <span class="input-unit">sec</span>
                            </div>
                        </div>
                        <div class="seeker-setting-row">
                            <div class="setting-info">
                                <label>Show notifications</label>
                                <span class="setting-desc">Display seek and volume notifications</span>
                            </div>
                            <div class="toggle-switch">
                                <input type="checkbox" id="enable-notifications" class="toggle-input">
                                <label for="enable-notifications" class="toggle-label">
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                        <div class="seeker-setting-row">
                            <div class="setting-info">
                                <label>Show seek preview</label>
                                <span class="setting-desc">Preview position while seeking</span>
                            </div>
                            <div class="toggle-switch">
                                <input type="checkbox" id="enable-seek-preview" class="toggle-input">
                                <label for="enable-seek-preview" class="toggle-label">
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="seeker-settings-section">
                        <h3>
                            <svg class="section-icon" viewBox="0 0 24 24" width="18" height="18">
                                <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                            </svg>
                            Volume Control
                        </h3>
                        <div class="seeker-setting-row">
                            <div class="setting-info">
                                <label for="volume-step">Volume Step</label>
                                <span class="setting-desc">Volume change per up/down arrow key</span>
                            </div>
                            <div class="number-input-container">
                                <input type="number" id="volume-step" min="1" max="50" value="10">
                                <span class="input-unit">%</span>
                            </div>
                        </div>
                        <div class="seeker-setting-row">
                            <div class="setting-info">
                                <label>Enable volume control</label>
                                <span class="setting-desc">Control volume with keyboard shortcuts</span>
                            </div>
                            <div class="toggle-switch">
                                <input type="checkbox" id="enable-volume-control" class="toggle-input">
                                <label for="enable-volume-control" class="toggle-label">
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="seeker-settings-section">
                        <h3>
                            <svg class="section-icon" viewBox="0 0 24 24" width="18" height="18">
                                <path fill="currentColor" d="M8 5v14l11-7z"/>
                            </svg>
                            Playback Control
                        </h3>
                        <div class="seeker-setting-row">
                            <div class="setting-info">
                                <label>Enable play/pause control</label>
                                <span class="setting-desc">Control playback with keyboard shortcuts</span>
                            </div>
                            <div class="toggle-switch">
                                <input type="checkbox" id="enable-playback-control" class="toggle-input">
                                <label for="enable-playback-control" class="toggle-label">
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="seeker-settings-section seeker-shortcuts-section">
                        <h3>
                            <svg class="section-icon" viewBox="0 0 24 24" width="18" height="18">
                                <path fill="currentColor" d="M20 7h-9v2h9V7zm0 6h-5v2h5v-2zM4 5.5C4 6.33 4.67 7 5.5 7S7 6.33 7 5.5 6.33 4 5.5 4 4 4.67 4 5.5zM4 12.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5S6.33 11 5.5 11 4 11.67 4 12.5zM4 19.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5S6.33 18 5.5 18 4 18.67 4 19.5z"/>
                            </svg>
                            Keyboard Shortcuts
                        </h3>
                        <div class="seeker-shortcuts-grid">
                            <div class="seeker-shortcut-item">
                                <span class="shortcut-key">←/→</span>
                                <span class="shortcut-desc" id="arrow-seek-desc">Seek backward/forward</span>
                            </div>
                            <div class="seeker-shortcut-item">
                                <span class="shortcut-key">J/L</span>
                                <span class="shortcut-desc" id="extended-seek-desc">Fast seek backward/forward</span>
                            </div>
                            <div class="seeker-shortcut-item">
                                <span class="shortcut-key">Space</span>
                                <span class="shortcut-desc">Play/Pause</span>
                            </div>
                            <div class="seeker-shortcut-item">
                                <span class="shortcut-key">K</span>
                                <span class="shortcut-desc">Play/Pause</span>
                            </div>
                            <div class="seeker-shortcut-item">
                                <span class="shortcut-key">↑/↓</span>
                                <span class="shortcut-desc" id="volume-step-desc">Volume up/down</span>
                            </div>
                            <div class="seeker-shortcut-item">
                                <span class="shortcut-key">M</span>
                                <span class="shortcut-desc">Mute/Unmute</span>
                            </div>
                            <div class="seeker-shortcut-item">
                                <span class="shortcut-key">F</span>
                                <span class="shortcut-desc">Fullscreen</span>
                            </div>
                            <div class="seeker-shortcut-item">
                                <span class="shortcut-key">C</span>
                                <span class="shortcut-desc">Toggle captions</span>
                            </div>
                            <div class="seeker-shortcut-item">
                                <span class="shortcut-key">0-9</span>
                                <span class="shortcut-desc">Seek to percentage</span>
                            </div>
                            <div class="seeker-shortcut-item" id="next-episode-shortcut" style="display: none;">
                                <span class="shortcut-key">N</span>
                                <span class="shortcut-desc">Next episode</span>
                            </div>
                            <div class="seeker-shortcut-item" id="skip-intro-shortcut" style="display: none;">
                                <span class="shortcut-key">S</span>
                                <span class="shortcut-desc">Skip intro</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="seeker-settings-section">
                        <h3>
                            <svg class="section-icon" viewBox="0 0 24 24" width="18" height="18">
                                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                            About
                        </h3>
                        <div class="seeker-about-info">
                            <div class="about-item">
                                <strong>Seeker - Universal Media Controls</strong>
                                <span class="version-badge">v1.0.0</span>
                            </div>
                            <p>Adds keyboard-based seeking and media controls to streaming platforms.</p>
                            <div class="seeker-platform-status">
                                <span id="current-platform">Platform: Loading...</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="seeker-settings-footer">
                    <div class="auto-save-status">
                        <svg viewBox="0 0 24 24" width="14" height="14">
                            <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                        <span>Settings saved automatically</span>
                    </div>
                    <button class="seeker-btn seeker-btn-secondary" id="reset-settings">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                        </svg>
                        Reset to Defaults
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Setup overlay styles
     */
    setupStyles() {
        const styles = `
            .seeker-settings-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1000000;
                display: none;
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                padding: 20px;
                box-sizing: border-box;
            }
            
            .seeker-settings-overlay.show {
                display: flex;
                animation: fadeIn 0.3s ease-out;
            }
            
            .seeker-settings-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.75);
                backdrop-filter: blur(8px);
            }
            
            .seeker-settings-panel {
                position: relative;
                background: white;
                border-radius: 16px;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
                max-width: 580px;
                width: 100%;
                max-height: calc(100vh - 40px);
                overflow: hidden;
                animation: slideIn 0.3s ease-out;
                display: flex;
                flex-direction: column;
            }
            
            .seeker-settings-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 20px 24px;
                border-bottom: 1px solid #CCCCCC;
                background: #F7F7F7;
                flex-shrink: 0;
            }
            
            .seeker-settings-header h2 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: #1d1d1f;
            }
            
            .seeker-settings-close {
                background: none;
                border: none;
                padding: 8px;
                border-radius: 8px;
                cursor: pointer;
                color: #6b7280;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .seeker-settings-close:hover {
                background: rgba(0, 0, 0, 0.1);
                color: #374151;
            }
            
            .seeker-settings-content {
                padding: 16px 24px;
                overflow-y: auto;
                flex: 1;
                min-height: 0;
            }
            
            .seeker-settings-section {
                margin-bottom: 20px;
            }
            
            .seeker-settings-section:last-child {
                margin-bottom: 0;
            }
            
            .seeker-settings-section h3 {
                margin: 0 0 12px 0;
                font-size: 15px;
                font-weight: 600;
                color: #1d1d1f;
                display: flex;
                align-items: center;
                gap: 8px;
                padding-bottom: 6px;
                border-bottom: 2px solid #F57F17;
            }
            
            .section-icon {
                color: #F57F17;
            }
            
            .seeker-setting-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
                padding: 8px 0;
                min-height: 40px;
            }
            
            .setting-info {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            
            .setting-info label {
                font-size: 14px;
                font-weight: 500;
                color: #1d1d1f;
                margin: 0;
                cursor: pointer;
            }
            
            .setting-desc {
                font-size: 12px;
                color: #6c6c70;
                line-height: 1.3;
            }
            
            .number-input-container {
                display: flex;
                align-items: center;
                gap: 6px;
                background: #F7F7F7;
                border: 1px solid #CCCCCC;
                border-radius: 8px;
                padding: 2px 8px 2px 2px;
                transition: all 0.2s ease;
            }
            
            .number-input-container:focus-within {
                border-color: #F57F17;
                box-shadow: 0 0 0 3px rgba(245, 127, 23, 0.1);
            }
            
            .number-input-container input[type="number"] {
                width: 50px;
                padding: 6px 8px;
                border: none;
                background: transparent;
                font-size: 14px;
                font-weight: 500;
                color: #1d1d1f;
                text-align: center;
                outline: none;
            }
            
            .input-unit {
                font-size: 12px;
                color: #6c6c70;
                font-weight: 500;
            }
            
            /* Modern Toggle Switches */
            .toggle-switch {
                position: relative;
                display: inline-block;
            }
            
            .toggle-input {
                opacity: 0;
                width: 0;
                height: 0;
                position: absolute;
            }
            
            .toggle-label {
                position: relative;
                display: inline-block;
                width: 44px;
                height: 24px;
                background: #CCCCCC;
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
                margin: 0;
            }
            
            .toggle-slider {
                position: absolute;
                content: "";
                height: 20px;
                width: 20px;
                left: 2px;
                top: 2px;
                background: white;
                border-radius: 50%;
                transition: all 0.3s ease;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            
            .toggle-input:checked + .toggle-label {
                background: #F57F17;
            }
            
            .toggle-input:checked + .toggle-label .toggle-slider {
                transform: translateX(20px);
            }
            
            .toggle-input:focus + .toggle-label {
                box-shadow: 0 0 0 3px rgba(245, 127, 23, 0.2);
            }
            
            /* Shortcuts Section */
            .seeker-shortcuts-section {
                margin-bottom: 20px;
            }
            
            .seeker-shortcuts-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 8px;
            }
            
            .seeker-shortcut-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: #F7F7F7;
                border-radius: 8px;
                border: 1px solid transparent;
                transition: all 0.2s ease;
            }
            
            .seeker-shortcut-item:hover {
                background: #f0f0f0;
                border-color: #e0e0e0;
            }
            
            .shortcut-key {
                font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
                background: white;
                color: #1d1d1f;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 600;
                min-width: fit-content;
                text-align: center;
                border: 1px solid #CCCCCC;
                box-shadow: 0 1px 0 #e0e0e0;
            }
            
            .shortcut-desc {
                font-size: 11px;
                color: #6c6c70;
                margin-left: 8px;
                flex: 1;
                font-weight: 500;
            }
            
            /* About Section */
            .seeker-about-info {
                font-size: 14px;
                line-height: 1.5;
                color: #6c6c70;
            }
            
            .about-item {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }
            
            .about-item strong {
                color: #1d1d1f;
            }
            
            .version-badge {
                background: #F57F17;
                color: white;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
            }
            
            .seeker-about-info p {
                margin: 0 0 12px 0;
            }
            
            .seeker-platform-status {
                margin-top: 12px;
                padding: 10px 12px;
                background: #fff8e1;
                border: 1px solid #ffc107;
                border-radius: 8px;
                font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
                font-size: 12px;
                color: #BF360C;
            }
            
            /* Footer */
            .seeker-settings-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 24px;
                border-top: 1px solid #e0e0e0;
                background: #F7F7F7;
                flex-shrink: 0;
            }
            
            .auto-save-status {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
                color: #2e7d32;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .auto-save-status.show {
                opacity: 1;
            }
            
            .auto-save-status svg {
                color: #2e7d32;
            }
            
            .seeker-btn {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                border: none;
                outline: none;
            }
            
            .seeker-btn:focus {
                box-shadow: 0 0 0 3px rgba(245, 127, 23, 0.2);
            }
            
            .seeker-btn-primary {
                background: #F57F17;
                color: white;
            }
            
            .seeker-btn-primary:hover {
                background: #BF360C;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(245, 127, 23, 0.3);
            }
            
            .seeker-btn-secondary {
                background: #F7F7F7;
                color: #1d1d1f;
                border: 1px solid #CCCCCC;
            }
            
            .seeker-btn-secondary:hover {
                background: #e8e8e8;
                color: #1d1d1f;
                border-color: #999999;
            }
            
            /* Animations */
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideIn {
                from { 
                    opacity: 0;
                    transform: scale(0.95) translateY(-10px); 
                }
                to { 
                    opacity: 1;
                    transform: scale(1) translateY(0); 
                }
            }
            
            /* Dark Theme */
            .seeker-dark-theme {
                background: #2c2c2e !important;
                color: #ffffff !important;
            }
            
            .seeker-dark-theme .seeker-settings-header {
                background: #1c1c1e !important;
                border-bottom-color: #38383a !important;
            }
            
            .seeker-dark-theme .seeker-settings-header h2 {
                color: #ffffff !important;
            }
            
            .seeker-dark-theme .seeker-settings-close {
                color: #8e8e93 !important;
            }
            
            .seeker-dark-theme .seeker-settings-close:hover {
                background: rgba(255, 255, 255, 0.1) !important;
                color: #ffffff !important;
            }
            
            .seeker-dark-theme .seeker-settings-footer {
                background: #1c1c1e !important;
                border-top-color: #38383a !important;
            }
            
            .seeker-dark-theme .auto-save-status {
                color: #32d74b !important;
            }
            
            .seeker-dark-theme .auto-save-status svg {
                color: #32d74b !important;
            }
            
            .seeker-dark-theme .seeker-settings-section h3 {
                color: #ffffff !important;
                border-bottom-color: #F57F17 !important;
            }
            
            .seeker-dark-theme .section-icon {
                color: #F57F17 !important;
            }
            
            .seeker-dark-theme .setting-info label {
                color: #ffffff !important;
            }
            
            .seeker-dark-theme .setting-desc {
                color: #8e8e93 !important;
            }
            
            .seeker-dark-theme .number-input-container {
                background: #1c1c1e !important;
                border-color: #38383a !important;
            }
            
            .seeker-dark-theme .number-input-container:focus-within {
                border-color: #F57F17 !important;
                box-shadow: 0 0 0 3px rgba(245, 127, 23, 0.1) !important;
            }
            
            .seeker-dark-theme .number-input-container input[type="number"] {
                color: #ffffff !important;
            }
            
            .seeker-dark-theme .input-unit {
                color: #8e8e93 !important;
            }
            
            .seeker-dark-theme .toggle-label {
                background: #CCCCCC !important;
            }
            
            .seeker-dark-theme .toggle-input:checked + .toggle-label {
                background: #F57F17 !important;
            }
            
            .seeker-dark-theme .toggle-input:focus + .toggle-label {
                box-shadow: 0 0 0 3px rgba(245, 127, 23, 0.2) !important;
            }
            
            .seeker-dark-theme .seeker-shortcut-item {
                background: #1c1c1e !important;
                border-color: transparent !important;
            }
            
            .seeker-dark-theme .seeker-shortcut-item:hover {
                background: #2c2c2e !important;
                border-color: #38383a !important;
            }
            
            .seeker-dark-theme .shortcut-key {
                background: #38383a !important;
                color: #ffffff !important;
                border-color: #48484a !important;
                box-shadow: 0 1px 0 #5e5e60 !important;
            }
            
            .seeker-dark-theme .shortcut-desc {
                color: #8e8e93 !important;
            }
            
            .seeker-dark-theme .seeker-about-info {
                color: #8e8e93 !important;
            }
            
            .seeker-dark-theme .about-item strong {
                color: #ffffff !important;
            }
            
            .seeker-dark-theme .version-badge {
                background: #F57F17 !important;
            }
            
            .seeker-dark-theme .seeker-platform-status {
                background: #2d1b1b !important;
                border-color: #4a1d1d !important;
                color: #ff6b6b !important;
            }
            
            .seeker-dark-theme .seeker-btn-primary {
                background: #F57F17 !important;
            }
            
            .seeker-dark-theme .seeker-btn-primary:hover {
                background: #BF360C !important;
                box-shadow: 0 4px 12px rgba(245, 127, 23, 0.3) !important;
            }
            
            .seeker-dark-theme .seeker-btn-secondary {
                background: #1c1c1e !important;
                color: #8e8e93 !important;
                border-color: #48484a !important;
            }
            
            .seeker-dark-theme .seeker-btn-secondary:hover {
                background: #38383a !important;
                color: #ffffff !important;
                border-color: #6b7280 !important;
            }
            
            .seeker-dark-theme .seeker-btn:focus {
                box-shadow: 0 0 0 3px rgba(245, 127, 23, 0.2) !important;
            }

            /* Responsive Design */
            @media (max-width: 640px) {
                .seeker-settings-overlay {
                    padding: 10px;
                }
                
                .seeker-settings-panel {
                    max-height: calc(100vh - 20px);
                    border-radius: 12px;
                }
                
                .seeker-settings-header,
                .seeker-settings-content,
                .seeker-settings-footer {
                    padding: 16px;
                }
                
                .seeker-setting-row {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 6px;
                    padding: 8px 0;
                }
                
                .setting-info {
                    width: 100%;
                }
                
                .toggle-switch {
                    align-self: flex-end;
                }
                
                .number-input-container {
                    align-self: flex-end;
                }
                
                .seeker-shortcuts-grid {
                    grid-template-columns: 1fr;
                    gap: 6px;
                }
                
                .seeker-shortcut-item {
                    padding: 8px 10px;
                }
                
                .seeker-settings-footer {
                    flex-direction: column;
                    gap: 8px;
                    align-items: center;
                }
                
                .auto-save-status {
                    order: 2;
                }
                
                .seeker-btn {
                    order: 1;
                    width: 100%;
                    justify-content: center;
                }
            }
            

        `;
        
        DOMUtils.addCSS(styles, 'seeker-settings-styles');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (!this.overlay) {
            logger.error('SettingsOverlay: Cannot setup event listeners - overlay not created');
            return;
        }

        // Close button
        const closeBtn = this.overlay.querySelector('.seeker-settings-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        // Backdrop click
        const backdrop = this.overlay.querySelector('.seeker-settings-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => this.hide());
        }

        // Reset button
        const resetBtn = this.overlay.querySelector('#reset-settings');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetSettings());
        }

        // Auto-save for all inputs
        this.setupAutoSave();

        // Keyboard shortcut to open settings (Ctrl/Cmd + Shift + S)
        document.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'KeyS') {
                event.preventDefault();
                this.toggle();
            }
        });

        // Escape to close
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Escape' && this.isVisible) {
                event.preventDefault();
                this.hide();
            }
        });
    }

    /**
     * Initialize settings with config system
     */
    async initializeSettings() {
        if (this.config) {
            await this.config.waitForLoad();
            logger.debug('SettingsOverlay initialized with config');
        } else {
            logger.warn('SeekerConfig not available in SettingsOverlay');
        }
        this.updateUI();
    }

    /**
     * Update UI with current settings
     */
    updateUI() {
        if (!this.overlay) {
            logger.error('SettingsOverlay: Cannot update UI - overlay not available');
            return;
        }

        const seekAmountInput = this.overlay.querySelector('#seek-amount');
        const volumeStepInput = this.overlay.querySelector('#volume-step');
        const notificationsCheckbox = this.overlay.querySelector('#enable-notifications');
        const volumeControlCheckbox = this.overlay.querySelector('#enable-volume-control');
        const playbackControlCheckbox = this.overlay.querySelector('#enable-playback-control');
        const seekPreviewCheckbox = this.overlay.querySelector('#enable-seek-preview');
        const platformStatus = this.overlay.querySelector('#current-platform');

        if (this.config) {
            if (seekAmountInput) seekAmountInput.value = this.config.get('seekAmount', 5);
            if (volumeStepInput) volumeStepInput.value = Math.round(this.config.get('volumeStep', 0.1) * 100);
            if (notificationsCheckbox) notificationsCheckbox.checked = this.config.get('enableNotifications', true);
            if (volumeControlCheckbox) volumeControlCheckbox.checked = this.config.get('enableVolumeControl', true);
            if (playbackControlCheckbox) playbackControlCheckbox.checked = this.config.get('enablePlaybackControl', true);
            if (seekPreviewCheckbox) seekPreviewCheckbox.checked = this.config.get('enableSeekPreview', false);
        }

        // Update platform status
        if (platformStatus) {
            const currentPlayer = this.mediaController ? this.mediaController.currentPlayer : null;
            const platform = currentPlayer ? currentPlayer.platform : 'No player detected';
            platformStatus.textContent = `Platform: ${platform}`;
        }

        // Update dynamic shortcut descriptions
        this.updateShortcutDescriptions();

        // Show/hide platform-specific shortcuts
        this.updatePlatformShortcuts();
    }

    /**
     * Update dynamic shortcut descriptions based on current settings
     */
    updateShortcutDescriptions() {
        if (!this.overlay) {
            logger.warn('SettingsOverlay: Cannot update shortcut descriptions - overlay not available');
            return;
        }

        const arrowSeekDesc = this.overlay.querySelector('#arrow-seek-desc');
        const extendedSeekDesc = this.overlay.querySelector('#extended-seek-desc');
        const volumeStepDesc = this.overlay.querySelector('#volume-step-desc');

        if (this.config) {
            const seekAmounts = this.config.getSeekAmounts();
            logger.debug('Updating shortcut descriptions with config:', seekAmounts);

            if (arrowSeekDesc) {
                arrowSeekDesc.textContent = `Seek backward/forward (${seekAmounts.arrow}s)`;
                logger.debug('Updated arrow seek description');
            } else {
                logger.warn('Arrow seek description element not found');
            }

            if (extendedSeekDesc) {
                extendedSeekDesc.textContent = `Fast seek backward/forward (${seekAmounts.extended}s)`;
                logger.debug('Updated extended seek description');
            } else {
                logger.warn('Extended seek description element not found');
            }

            if (volumeStepDesc) {
                const volumePercent = Math.round(this.config.get('volumeStep', 0.1) * 100);
                volumeStepDesc.textContent = `Volume up/down (${volumePercent}%)`;
                logger.debug('Updated volume step description');
            } else {
                logger.warn('Volume step description element not found');
            }
        } else {
            // Fall back to simple descriptions if config not available
            if (arrowSeekDesc) {
                arrowSeekDesc.textContent = 'Seek backward/forward';
            }
            if (extendedSeekDesc) {
                extendedSeekDesc.textContent = 'Fast seek backward/forward';
            }
            if (volumeStepDesc) {
                volumeStepDesc.textContent = 'Volume up/down';
            }
        }
    }

    /**
     * Update platform-specific shortcuts visibility
     */
    updatePlatformShortcuts() {
        if (!this.overlay) {
            logger.warn('SettingsOverlay: Cannot update platform shortcuts - overlay not available');
            return;
        }

        const nextEpisodeShortcut = this.overlay.querySelector('#next-episode-shortcut');
        const skipIntroShortcut = this.overlay.querySelector('#skip-intro-shortcut');
        
        if (!nextEpisodeShortcut || !skipIntroShortcut) {
            logger.warn('Could not find shortcut elements in overlay');
            return;
        }

        // Check if we're on Paramount+ and if features are available
        const hostname = DOMUtils.getHostname();
        const isParamount = hostname.includes('paramountplus.com');
        
        logger.debug('Platform shortcuts update:', { hostname, isParamount });
        
        if (isParamount) {
            // Check if next episode button exists and is visible
            const nextButton = document.querySelector('.btn-next');
            const isNextAvailable = nextButton && 
                                   !nextButton.disabled && 
                                   nextButton.offsetParent !== null && 
                                   window.getComputedStyle(nextButton).display !== 'none';
            
            nextEpisodeShortcut.style.display = isNextAvailable ? 'flex' : 'none';
            
            // Check if skip intro button exists and is visible
            const skipButton = document.querySelector('.skip-button');
            const isSkipAvailable = skipButton && 
                                   !skipButton.disabled && 
                                   skipButton.offsetParent !== null && 
                                   window.getComputedStyle(skipButton).display !== 'none';
            
            skipIntroShortcut.style.display = isSkipAvailable ? 'flex' : 'none';
            
            logger.debug('Paramount shortcuts updated:', {
                nextEpisode: isNextAvailable,
                skipIntro: isSkipAvailable,
                nextButton: !!nextButton,
                skipButton: !!skipButton
            });
        } else {
            // Hide Paramount-specific shortcuts on other platforms
            nextEpisodeShortcut.style.display = 'none';
            skipIntroShortcut.style.display = 'none';
            
            logger.debug('Non-Paramount platform, hiding shortcuts');
        }
    }



    /**
     * Reset settings to defaults
     */
    resetSettings() {
        if (this.config) {
            this.config.resetToDefaults();
        }
        this.updateUI();
        this.showAutoSaveFeedback();
        if (this.config && this.config.get('enableNotifications', true)) {
            window.SeekerNotification.showInfo('Settings Reset', 'Settings restored to defaults');
        }
    }

    /**
     * Show overlay
     */
    show() {
        this.updateUI(); // Refresh UI with current settings
        this.applyTheme(); // Ensure theme is applied
        this.overlay.classList.add('show');
        this.isVisible = true;
        
        // Focus the first input
        const firstInput = this.overlay.querySelector('input');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
        
        // Start periodic updates for platform shortcuts while overlay is visible
        this.startPlatformUpdates();
        
        logger.debug('Settings overlay shown');
    }

    /**
     * Hide overlay
     */
    hide() {
        this.overlay.classList.remove('show');
        this.isVisible = false;
        
        // Stop periodic updates
        this.stopPlatformUpdates();
        
        logger.debug('Settings overlay hidden');
    }

    /**
     * Start periodic updates for platform-specific shortcuts
     */
    startPlatformUpdates() {
        // Clear any existing interval
        this.stopPlatformUpdates();
        
        // Update immediately
        this.updatePlatformShortcuts();
        
        // Set up periodic updates every 1 second while overlay is visible
        this.platformUpdateInterval = setInterval(() => {
            if (this.isVisible) {
                this.updatePlatformShortcuts();
            } else {
                this.stopPlatformUpdates();
            }
        }, 1000);
    }

    /**
     * Stop periodic updates for platform-specific shortcuts
     */
    stopPlatformUpdates() {
        if (this.platformUpdateInterval) {
            clearInterval(this.platformUpdateInterval);
            this.platformUpdateInterval = null;
        }
    }

    /**
     * Toggle overlay visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Check if overlay is visible
     * @returns {boolean} Whether overlay is visible
     */
    isOverlayVisible() {
        return this.isVisible;
    }

    /**
     * Setup auto-save for all settings inputs
     */
    setupAutoSave() {
        if (!this.overlay) return;

        // Seek amount input
        const seekAmountInput = this.overlay.querySelector('#seek-amount');
        if (seekAmountInput) {
            seekAmountInput.addEventListener('input', (event) => {
                const value = parseInt(event.target.value) || 5;
                this.autoSaveSetting('seekAmount', value);
                this.updateShortcutDescriptions();
            });
        }

        // Volume step input
        const volumeStepInput = this.overlay.querySelector('#volume-step');
        if (volumeStepInput) {
            volumeStepInput.addEventListener('input', (event) => {
                const value = (parseInt(event.target.value) || 10) / 100;
                this.autoSaveSetting('volumeStep', value);
                this.updateShortcutDescriptions();
            });
        }

        // Toggle switches
        const toggles = [
            { id: 'enable-notifications', key: 'enableNotifications' },
            { id: 'enable-seek-preview', key: 'enableSeekPreview' },
            { id: 'enable-volume-control', key: 'enableVolumeControl' },
            { id: 'enable-playback-control', key: 'enablePlaybackControl' }
        ];

        toggles.forEach(({ id, key }) => {
            const toggle = this.overlay.querySelector(`#${id}`);
            if (toggle) {
                toggle.addEventListener('change', (event) => {
                    this.autoSaveSetting(key, event.target.checked);
                });
            }
        });
    }

    /**
     * Auto-save a single setting
     */
    async autoSaveSetting(key, value) {
        try {
            // Update config
            if (this.config) {
                this.config.set(key, value);
            }

            // Update media controller
            const settings = { [key]: value };
            this.mediaController.updateSettings(settings);

            // Update notification system for relevant settings
            if (key === 'enableNotifications') {
                if (value) {
                    window.SeekerNotification.enable();
                } else {
                    window.SeekerNotification.disable();
                }
            }

            // Show auto-save feedback
            this.showAutoSaveFeedback();

            logger.debug('Auto-saved setting:', { [key]: value });

        } catch (error) {
            logger.error('Failed to auto-save setting:', error);
            // Could show an error indicator here
        }
    }

    /**
     * Show auto-save feedback
     */
    showAutoSaveFeedback() {
        const status = this.overlay.querySelector('.auto-save-status');
        if (status) {
            status.classList.add('show');
            
            // Hide after 2 seconds
            setTimeout(() => {
                status.classList.remove('show');
            }, 2000);
        }
    }

    /**
     * Apply theme based on system preference
     */
    applyTheme() {
        if (!this.overlay) return;
        
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const panel = this.overlay.querySelector('.seeker-settings-panel');
        
        if (panel) {
            if (prefersDark) {
                panel.classList.add('seeker-dark-theme');
            } else {
                panel.classList.remove('seeker-dark-theme');
            }
        }
        
        logger.debug('Theme applied:', prefersDark ? 'dark' : 'light');
    }

    /**
     * Get current settings
     * @returns {Object} Current settings
     */
    getSettings() {
        return this.config ? this.config.getSettings() : {};
    }

    /**
     * Destroy overlay
     */
    destroy() {
        // Stop any ongoing updates
        this.stopPlatformUpdates();
        
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        
        // Remove styles
        const styles = document.getElementById('seeker-settings-styles');
        if (styles) {
            styles.remove();
        }
        
        this.isVisible = false;
        logger.debug('Settings overlay destroyed');
    }
}

// Export for use in main script
window.SettingsOverlay = SettingsOverlay;
