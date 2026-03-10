# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**QuietMark** is a cross-platform distraction-free markdown editor built with React + Vite + Electron. It runs both as a desktop app (Electron) and in the browser (with graceful degradation for file I/O). Key features: live split-pane preview, CodeMirror 6 editor, Fluent UI v9, dark mode, auto-save, HTML/PDF export, and bilingual (EN/ES) support.

## Commands

```bash
# Browser development
npm run dev              # Start Vite dev server at localhost:5173
npm run build            # Production web build → dist/
npm run preview          # Preview production build

# Electron development
npm run electron:dev     # Hot-reload Electron (concurrently runs Vite + Electron)
npm run electron:preview # Build then launch Electron (no hot-reload)

# Packaging
npm run electron:build   # Build Electron NSIS installer → release/
npm run mas:build        # Build macOS App Store version
npm run msix:build       # Full MSIX pipeline (build → pack → sign with dev cert)
```

There are **no tests and no linting** configured in this project.

## Architecture

### Two-Process Electron Model

```
Main Process (electron/main.cjs)
  - Window creation, native menus (rebuilt on language change), file I/O, PDF export
  - Close-event handler for unsaved-changes guard
  ↕ IPC via preload bridge
Preload (electron/preload.cjs)
  - contextBridge exposes window.electronAPI (secure IPC only)
  ↕ window.electronAPI calls
Renderer (src/ — React)
  - Detects Electron via window.electronAPI; gracefully degrades in browser
  - All file/menu operations go through electronAPI
```

### Key Architectural Patterns

**`stateRef` for stable IPC callbacks** (`src/App.jsx`): IPC listeners are registered once (empty `useCallback` deps) but still read fresh state by keeping a `stateRef.current` in sync. This avoids re-registering listeners on every render.

**CodeMirror two-way sync** (`src/Editor.jsx`): An `isInternalUpdate` ref prevents feedback loops when the parent sets value vs. the user types. Themes hot-swap via a `Compartment` without recreating the editor. The component exposes an imperative handle (`applyFormat`, `focus`) via `useImperativeHandle`.

**Dual theme system** (`src/App.jsx`, `App.css`): CSS custom properties toggled via `data-theme="dark"` on `<html>` handle custom elements; a separate Fluent UI `<FluentProvider>` theme controls Fluent components; CodeMirror theme swaps independently via Compartment.

**i18n across two processes**: The renderer uses `i18next` + `react-i18next` (async). The main process has a separate synchronous i18next instance (`electron/i18n-main.cjs`) for menu strings. Language changes flow: renderer → `language:change` IPC → main rebuilds menu → `menu:language` IPC → renderer echoes.

**PDF export** (`electron/main.cjs`): A hidden offscreen `BrowserWindow` loads the sanitized HTML via a `data:` URI, then `webContents.printToPDF()` produces the PDF buffer.

### Source Files

| File | Responsibility |
|------|---------------|
| `src/App.jsx` | All top-level state, IPC subscriptions, toolbar, split-pane layout, status bar |
| `src/Editor.jsx` | CodeMirror 6 wrapper with imperative handle |
| `src/i18n.js` | Renderer i18n init; exports `SUPPORTED_LANGUAGES` |
| `src/App.css` | CSS custom properties for theming; platform-specific selectors |
| `electron/main.cjs` | Window setup, menus, file ops, PDF export, close guard |
| `electron/preload.cjs` | contextBridge — the only surface between main and renderer |
| `electron/i18n-main.cjs` | Synchronous i18n for main process menu strings |
| `locales/{en,es}/translation.json` | All user-visible strings |

### Adding a New Language

1. Create `locales/<code>/translation.json` mirroring `en/translation.json`
2. Add resources to both `src/i18n.js` and `electron/i18n-main.cjs`
3. Add the language entry to `SUPPORTED_LANGUAGES` in `src/i18n.js`
4. Add a menu item in `buildMenu()` inside `electron/main.cjs`

### Security Notes

- `contextIsolation: true`, `nodeIntegration: false` — all IPC must go through `electron/preload.cjs`
- Markdown preview HTML is sanitized with DOMPurify before `dangerouslySetInnerHTML`

### Coding Conventions

- Electron files use CommonJS (`.cjs`) because `package.json` sets `"type": "module"`
- Prefer stable callbacks with `stateRef` over adding state variables to `useCallback` deps
- Use `i18n.t()` (imported instance) inside callbacks/event handlers, not the `useTranslation` hook
- Keep components flat; avoid premature abstractions
- CSS custom properties for any new theme-sensitive styles
