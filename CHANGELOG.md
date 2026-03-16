# Changelog

All notable changes to QuietMark will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] — 2026-03-16

### Added

- **Window menu (macOS)** — Standard Window menu with Minimize, Zoom, and a dynamic entry showing the current document title to reopen the main window after closing
- **Last file restore (Electron)** — Reopens the most recently edited file on launch; persisted via localStorage
- **`file:read` IPC channel** — New preload API for reading a file by path, used for last-file restore
- **Welcome text on first launch only** — Starter markdown is shown only on the first launch; subsequent launches restore the last file or start blank
- **Per-architecture MSIX scripts** — Separate `msix:build:x64` and `msix:build:arm64` npm scripts with `winapp pack --arch` for correct manifest stamping

### Fixed

- **Menu errors after window close (macOS)** — Cleared destroyed `BrowserWindow` reference on close; menu actions now recreate the window instead of erroring
- **Quit from app menu (macOS)** — `QuietMark > Quit` now fully quits the app instead of leaving it lingering in the dock
- **Save dialog default path (Windows)** — Save As now defaults to the user's Documents folder, preferring OneDrive Documents when available
- **CRLF normalization** — File reads now normalize `\r\n` to `\n` to prevent false dirty-state detection on Windows
- **Auto-save draft logic** — Drafts are no longer saved to localStorage when editing a named file, preventing stale draft restoration

### Changed

- **MSIX architecture handling** — `appxmanifest.xml` uses `ProcessorArchitecture="neutral"` as a base; actual architecture set at pack time via `--arch` flag

## [1.0.0] — 2026-03-07

First public release of QuietMark as a desktop application.

### Added

- **Core editor** — Split-pane markdown editor with live preview powered by `marked`
- **CodeMirror 6 integration** — Syntax highlighting, line numbers, undo/redo history, and find/replace for the editor pane
- **Fluent UI** — Modern toolbar with Fluent UI v9 components (Button, Tooltip, Menu, Divider) and platform-adaptive styling
- **Platform effects** — Mica transparency on Windows, vibrancy on macOS
- **Dark mode** — Automatic system detection with manual toggle; persisted to localStorage
- **File operations** — New, Open, Save, Save As with native file dialogs and dirty-state tracking
- **Unsaved changes guard** — Native dialog on close (Electron) and beforeunload prompt (browser)
- **Export** — Export to standalone HTML or PDF via File menu (PDF uses hidden BrowserWindow for clean rendering)
- **Auto-save** — Drafts saved to localStorage with 500ms debounce; automatic recovery on restart
- **Word & character count** — Live stats in status bar with selection length when text is selected
- **Localization** — English and Spanish translations for all UI strings, menus, and dialogs; language picker in toolbar and View menu
- **Keyboard shortcuts** — Standard accelerators: Ctrl/⌘+N (New), O (Open), S (Save), Shift+S (Save As), B (Bold), I (Italic), Shift+D (Dark mode), Shift+E (Export HTML), Shift+P (Export PDF)
- **Splash screen** — Loading spinner shown until React mounts, using Electron's `ready-to-show` pattern
- **XSS protection** — All rendered markdown sanitized through DOMPurify
- **MSIX packaging** — Windows MSIX package via winapp CLI with dev certificate signing and `.md`/`.markdown` file associations
- **App icons** — Custom icon for title bar, taskbar, and MSIX tile assets
- **Electron security** — Context isolation enabled, node integration disabled, secure IPC via preload bridge

### Security

- HTML preview sanitized with DOMPurify to prevent XSS from malicious markdown
- Electron context isolation and disabled node integration
- No remote content loaded; all rendering is local
