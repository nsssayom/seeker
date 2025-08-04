# Seeker - Universal Video Player Keyboard Controls

A Chrome extension that unifies keyboard controls across all major streaming platforms including Paramount+, Netflix, Disney+, Hulu, and many more.

## Features

- **Unified Keyboard Controls**: Consistent arrow keys for seeking, spacebar for play/pause across all platforms
- **Multi-Platform Support**: Works on 10+ streaming platforms with automatic detection  
- **Smart Player Detection**: Automatically finds and controls video players on any page
- **Customizable Settings**: Adjust seek duration, enable/disable specific shortcuts
- **Visual Feedback**: Toast notifications for all actions
- **Modern UI**: Dark mode interface with accessibility support

## Supported Platforms

- Paramount+ ⭐ **(Primary focus)**
- Disney+
- Hulu
- Amazon Prime Video
- HBO Max
- Peacock
- Apple TV+
- Tubi
- Any website with HTML5 video players

> **Note**: This extension creates a unified control experience across streaming platforms, bringing consistent keyboard shortcuts to services that lack them or have inconsistent implementations.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` / `→` | Seek backward/forward (default: 5s, configurable) |
| `↑` / `↓` | Volume up/down |
| `Space` / `K` | Play/pause |
| `J` / `L` | Extended seek backward/forward (2x arrow amount) |
| `M` | Mute/unmute |
| `C` | Toggle captions/subtitles |
| `F` | Toggle fullscreen |
| `N` | Next episode (when available) |
| `0-9` | Jump to 0%-90% of video |

### Platform-Specific Shortcuts

**All Platforms:**

- Number keys `0-9` - Jump to specific video positions
- `J` / `L` - Alternative extended seeking
- `K` - Alternative play/pause control

> **Note**: Platform-specific shortcuts (like skip intro buttons) are preserved and work alongside universal controls.

## Installation

### From Source (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension folder
5. The Seeker extension should now appear in your extensions list

### From Chrome Web Store

> **Note**: Extension will be published to the Chrome Web Store soon

## Usage

1. **Automatic Activation**: The extension automatically activates when you visit supported streaming platforms
2. **Status Check**: Click the extension icon to see the current status and detected platform
3. **Settings**: Access settings through the popup or by pressing `Ctrl+Shift+S` on supported pages
4. **Keyboard Controls**: Use the keyboard shortcuts listed above to control video playback

## Configuration

### Settings Panel

Access the settings panel to customize:

- **Seek Duration**: Adjust how far arrow keys seek (1s-60s, default: 5s)
- **Volume Step**: Control volume adjustment increment
- **Enable/Disable Shortcuts**: Toggle specific keyboard shortcuts
- **Platform Settings**: Platform-specific customizations

### Quick Settings

- Click the extension icon for quick status and toggle controls
- View detected platform and current settings
- Access full settings panel with one click

## Technical Details

### Architecture

The extension uses a modular architecture with the following components:

- **Core Modules**: Player detection, media control, keyboard handling
- **Platform Integrations**: Specialized support for each streaming platform
- **UI Components**: Notifications, settings overlay, popup interface
- **Utils**: Logging, DOM utilities, storage management

### Platform Detection

The extension automatically detects streaming platforms using:

1. URL pattern matching
2. DOM structure analysis
3. Video player element detection
4. Platform-specific optimization loading

### Player Control

Video control is handled through:

- Standard HTML5 video API
- Platform-specific player APIs when available
- Keyboard event simulation for platform shortcuts
- Volume and fullscreen control via browser APIs

## Development

### Project Structure

```text
seeker/
├── manifest.json              # Extension configuration
├── js/
│   ├── core/                 # Core functionality modules
│   │   ├── player-detector.js
│   │   ├── media-controller.js
│   │   ├── keyboard-handler.js
│   │   └── logger.js
│   ├── platforms/            # Platform-specific integrations
│   │   ├── paramount.js      # Primary target platform
│   │   └── generic.js        # Universal HTML5 video support
│   ├── ui/                   # UI components
│   │   ├── notification.js
│   │   └── settings-overlay.js
│   ├── utils/                # Utility modules
│   │   ├── dom-utils.js
│   │   └── storage.js
│   └── main.js              # Main entry point
├── css/
│   ├── seeker-ui.css        # Main UI styles
│   └── popup.css            # Popup interface styles
├── popup/
│   ├── popup.html           # Extension popup
│   └── popup.js             # Popup functionality
├── icons/                   # Extension icons
└── README.md               # This file
```

### Adding New Platforms

To add support for a new streaming platform:

1. Create a new file in `js/platforms/` (e.g., `newplatform.js`)
2. Implement the platform class extending the base platform interface
3. Add URL patterns to the manifest.json host permissions
4. Update the platform detection logic in `player-detector.js`

### Testing

1. Load the extension in developer mode
2. Visit supported streaming platforms
3. Test keyboard shortcuts and verify functionality
4. Check browser console for any errors or warnings
5. Test settings persistence and platform switching

## Browser Compatibility

- **Chrome**: Version 88+ (Manifest V3 support required)
- **Edge**: Version 88+ (Chromium-based)
- **Opera**: Version 74+
- **Brave**: Version 1.20+

## Privacy & Permissions

The extension requires the following permissions:

- **Host Permissions**: Access to streaming platform websites for player control
- **Storage**: Save user preferences and settings
- **Scripting**: Inject content scripts for keyboard control
- **Tabs**: Popup communication with active tabs

**Privacy Commitment**: This extension does not collect, store, or transmit any user data. All settings are stored locally in your browser.

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Follow the existing code style and architecture
4. Add tests for new functionality
5. Update documentation as needed
6. Submit a pull request

## Support

If you encounter issues or have feature requests:

1. Check the browser console for error messages
2. Verify the platform is supported
3. Try disabling other extensions that might conflict
4. Report issues with detailed steps to reproduce

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Version History

### v1.0.0 (Initial Release)

- Universal keyboard controls for streaming platforms
- Support for 10+ major streaming services
- Customizable settings and shortcuts
- Modern UI with dark mode support
- Comprehensive platform detection system

## Acknowledgments

- Inspired by the need for consistent media controls across platforms
- Built with modern web technologies and Chrome Extension APIs
- Thanks to the streaming platform communities for feature requests and feedback
