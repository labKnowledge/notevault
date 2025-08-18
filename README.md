# NoteVault - 3D Note Taking Chrome Extension

A modern Chrome extension that transforms note-taking with an immersive 3D interface. Access your notes directly from your browser toolbar with support for both 2D grid and 3D spatial views.

## ✨ Features

- **3D Note Visualization**: Interactive 3D environment for organizing notes spatially
- **Quick Access**: Browser toolbar popup for instant note access
- **Dual View Modes**: Switch between traditional 2D grid and immersive 3D views
- **Keyboard Shortcuts**: `Ctrl+Shift+N` (or `Cmd+Shift+N` on Mac) to open NoteVault
- **Save Web Pages**: Right-click context menu to save clean webpage content as notes
- **Smart Content Extraction**: Automatically removes ads, headers, footers, and sidebars
- **Local Storage**: All notes stored locally in your browser
- **Context Menus**: Right-click integration for quick note creation
- **Notifications**: Desktop notifications for important events

## 🚀 Quick Start

### Installation in Chrome

1. **Download the Extension**
   ```bash
   git clone <repository-url>
   cd notevault
   ```

2. **Install Dependencies** (optional, for development)
   ```bash
   npm install
   ```

3. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `notevault` folder

4. **Start Using**
   - Click the NoteVault icon in your toolbar
   - Use `Ctrl+Shift+N` to quickly open
   - Right-click on any webpage and select "Save page as note" to save clean content
   - Right-click on selected text and choose "Save selected text as note"
   - Create your first note!

## 📁 Project Structure

```
notevault/
├── manifest.json          # Extension configuration
├── popup.html            # Toolbar popup interface
├── notevault.html        # Main application page
├── js/
│   ├── app.js            # Main application logic
│   ├── popup.js          # Popup functionality
│   ├── background.js     # Service worker
│   ├── content.js        # Content script
│   └── convert.js        # Utility functions
├── css/
│   ├── style.css         # Main app styles
│   ├── popup.css         # Popup styles
│   └── content.css       # Content script styles
├── lib/                  # Third-party libraries
│   ├── three.min.js      # 3D graphics
│   ├── OrbitControls.js  # 3D navigation
│   └── gsap.min.js       # Animations
└── icons/               # Extension icons
```

## 🛠️ Development

### Prerequisites

- Node.js (for package management)
- Chrome browser
- Basic knowledge of JavaScript, HTML, CSS

### Setting Up Development Environment

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd notevault
   npm install
   ```

2. **Load Extension in Developer Mode**
   - Follow the installation steps above
   - Changes to JS/CSS files will require clicking the refresh button in `chrome://extensions/`

3. **Key Development Files**
   - `js/app.js:8` - Main application state and 3D view logic
   - `js/popup.js` - Browser popup functionality
   - `js/background.js` - Service worker for background tasks
   - `manifest.json:3` - Extension metadata and permissions

### Making Changes

1. **Modifying the UI**: Edit files in `css/` and HTML files
2. **Adding Features**: Extend `js/app.js` for main app, `js/popup.js` for popup
3. **Testing**: Reload extension in Chrome and test thoroughly
4. **3D Features**: Modify Three.js code in `js/app.js` (around line 546 for `currentView`)

## 🎯 Contributing

### Code Style

- Use modern JavaScript (ES6+)
- Follow existing naming conventions
- Comment complex 3D graphics code
- Test in multiple Chrome versions

### Development Workflow

1. **Fork & Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Develop & Test**
   - Make changes
   - Test in Chrome developer mode
   - Verify both 2D and 3D views work
   - Test keyboard shortcuts and context menus

3. **Commit & Push**
   ```bash
   git add .
   git commit -m "Add: your feature description"
   git push origin feature/your-feature-name
   ```

4. **Pull Request**
   - Create PR with clear description
   - Include screenshots/demos of new features
   - Ensure no console errors

### Common Development Tasks

- **Adding New Note Features**: Modify `js/app.js` state management
- **UI Changes**: Update CSS files and test responsiveness
- **3D Enhancements**: Work with Three.js in the 3D view section
- **Storage**: Use Chrome's `chrome.storage.local` API
- **Permissions**: Update `manifest.json` if new permissions needed

### Testing Checklist

- [ ] Extension loads without errors
- [ ] Popup opens and functions correctly
- [ ] Main app opens via popup and keyboard shortcut
- [ ] Both 2D and 3D views work
- [ ] Notes can be created, edited, and deleted
- [ ] Local storage persists between sessions
- [ ] No console errors in developer tools

## 📦 Libraries Used

- **Three.js**: 3D graphics and rendering
- **GSAP**: Smooth animations
- **Font Awesome**: Icons
- **OrbitControls**: 3D camera navigation

## 🔧 Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Storage**: Chrome local storage API
- **Permissions**: `storage`, `activeTab`, `commands`, `contextMenus`, `notifications`, `scripting`
- **Content Security Policy**: Secure script execution

## 🐛 Troubleshooting

**Extension won't load**: Check console for errors, ensure all files are present
**3D view not working**: Verify Three.js library is loaded correctly
**Notes not saving**: Check Chrome storage permissions
**Keyboard shortcut conflicts**: Change in Chrome extension settings

## 📄 License

[Add your license information here]

## 🤝 Support

For issues, feature requests, or contributions, please open an issue in the repository.