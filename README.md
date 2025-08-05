# Seeker

A Chrome extension that provides consistent keyboard controls across streaming platforms.

## What it does

Unifies media controls across different streaming services with the same keyboard shortcuts everywhere. Currently works on Paramount+, with more platforms planned.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `←` / `→` | Seek backward/forward (5 seconds) |
| `↑` / `↓` | Volume up/down |
| `Space` / `K` | Play/pause |
| `J` / `L` | Extended seek (10 seconds) |
| `M` | Mute/unmute |
| `F` | Toggle fullscreen |
| `S` | Skip intro (when available) |
| `N` | Next episode (when available) |
| `0-9` | Jump to 0%-90% of video |

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" and select the extension folder
5. Visit Paramount+ and the controls should work automatically

## How it works

The extension detects which streaming platform you're on and loads the appropriate controls. Currently supports Paramount+ with platform-specific features like skip intro and next episode shortcuts.

## Project structure

```
seeker/
├── manifest.json              # Extension config
├── js/
│   ├── core/                 # Core functionality 
│   │   ├── player-detector.js
│   │   ├── media-controller.js
│   │   └── keyboard-handler.js
│   ├── platforms/            # Platform-specific integrations
│   │   └── paramount.js      # Paramount+ (currently implemented)
│   ├── ui/                   # UI components
│   │   ├── notification.js
│   │   └── settings-overlay.js
│   ├── utils/                # Utilities
│   │   ├── dom-utils.js
│   │   ├── logger.js
│   │   └── config.js
│   └── main.js              # Entry point
├── css/
│   └── seeker-ui.css        # Styles
├── popup/                   # Extension popup
│   ├── popup.html
│   └── popup.js
└── icons/                   # Extension icons
```

## Adding new platforms

To add support for another streaming platform:

1. Create a new file in `js/platforms/` (e.g., `netflix.js`)
2. Implement a platform class with the required methods
3. Add the new platform's URL patterns to `manifest.json`
4. Update the platform detection logic in `js/main.js`

## Browser compatibility

Chrome 88+ (requires Manifest V3 support)

## License

MIT