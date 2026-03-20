# Architecture

QuietMark is a two-process Electron app with a React renderer.

## Process Model

```
┌─────────────────────────────────────────────┐
│  Main Process (electron/main.cjs)           │
│  - BrowserWindow management                 │
│  - Native menus (rebuilt on language change) │
│  - File I/O (open, save, export)            │
│  - PDF generation (hidden BrowserWindow)    │
│  - Close dialog (unsaved changes guard)     │
│  - i18n (electron/i18n-main.cjs)            │
├─────────────────────────────────────────────┤
│  Preload (electron/preload.cjs)             │
│  - contextBridge: electronAPI               │
│  - IPC invoke (file:open, file:read, file:save)│
│  - IPC on (menu events, language change)    │
│  - Platform identifier                      │
├─────────────────────────────────────────────┤
│  Renderer (src/)                            │
│  - React 18 + Fluent UI v9                  │
│  - CodeMirror 6 editor                      │
│  - marked + DOMPurify for preview           │
│  - i18next + react-i18next                  │
│  - Works standalone in browser (no Electron)│
└─────────────────────────────────────────────┘
```

## Key Design Decisions

### Dual-mode operation
The renderer detects Electron via `window.electronAPI` and gracefully degrades in the browser. File buttons are disabled, keyboard shortcuts fall back to web handlers, and `beforeunload` replaces native close dialogs.

### State management
No state library — just `useState` + a `stateRef` pattern. A mutable ref (`stateRef.current`) holds the latest state so stable `useCallback(fn, [])` handlers always read fresh values without re-registering IPC listeners.

### CodeMirror two-way sync
External value changes (file open, new file) are synced by comparing the incoming `value` prop against `view.state.doc.toString()` — if they differ, a transaction replaces the document. User typing triggers `onChange` which updates React state; the subsequent effect sees the value already matches CodeMirror and is a no-op. Callback refs (`onChangeRef`, `onSelectionChangeRef`) avoid recreating the EditorView when parent callbacks change.

### Theme architecture
Two systems coexist:
- **CSS custom properties** (`[data-theme="dark"]`) for layout and custom elements
- **FluentProvider** with `createLightTheme`/`createDarkTheme` for Fluent UI components

CodeMirror uses a `Compartment` to hot-swap between light and `oneDark` themes without recreating the editor.

### i18n architecture
- **Renderer**: `i18next` + `react-i18next` with `LanguageDetector` (localStorage → navigator → fallback)
- **Main process**: Standalone `i18next` instance (synchronous init for menu building)
- **Sync**: Renderer sends `language:change` IPC → main rebuilds menus. Menu language items send `menu:language` → renderer changes language and echoes back.

### Security
- `contextIsolation: true`, `nodeIntegration: false`
- All IPC goes through the preload contextBridge (no direct `ipcRenderer` in renderer)
- Preview HTML sanitized with DOMPurify before `dangerouslySetInnerHTML`

## Build Pipeline

```
npm run dev              →  Vite dev server (browser only)
npm run electron:dev     →  Vite + Electron concurrently (hot reload)
npm run electron:build   →  Vite build → electron-builder (NSIS installer)
npm run msix:build       →  Vite build → electron-builder --dir → winapp pack (MSIX)
```

## File Associations

The MSIX manifest (`appxmanifest.xml`) registers `.md` and `.markdown` file types. When a user double-clicks a markdown file, Windows launches QuietMark with the file path as an argument. (Note: argument handling in `main.cjs` is a future enhancement.)
