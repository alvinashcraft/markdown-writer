# Development Guide

## Setup

```bash
npm install
```

## Running

```bash
# Browser-only development
npm run dev

# Electron with hot reload
npm run electron:dev
```

## Building

### Web build
```bash
npm run build
```

### Electron installer (NSIS)
```bash
npm run electron:build
```

### Windows MSIX package
```bash
# Full pipeline: build → pack → sign
npm run msix:build

# Or step by step:
npm run electron:build:dir       # Unpacked Electron app
npm run msix:pack                # Pack into signed MSIX
```

### Installing the MSIX locally
```bash
# One-time: trust the dev certificate (admin terminal required)
npx winapp cert install ./devcert.pfx

# Then double-click release/QuietMark.msix
```

## Adding a New Language

1. Copy `locales/en/translation.json` to `locales/<code>/translation.json`
2. Translate all string values (keys must stay the same)
3. Add the language to `SUPPORTED_LANGUAGES` in `src/i18n.js`:
   ```js
   { code: 'fr', label: 'Français' },
   ```
4. Add a radio menu item in `buildMenu()` in `electron/main.cjs`:
   ```js
   { label: 'Français', type: 'radio', checked: i18n.language === 'fr',
     click: () => mainWindow?.webContents.send('menu:language', 'fr') },
   ```
5. Register the resource in `electron/i18n-main.cjs`:
   ```js
   const fr = require('../locales/fr/translation.json');
   // Add to resources: fr: { translation: fr }
   // Add 'fr' to supportedLngs array
   ```
6. Do the same registration in `src/i18n.js`

## Project Conventions

- **CommonJS for Electron** — `electron/` files use `.cjs` extension because `package.json` has `"type": "module"`
- **Stable callbacks** — IPC listeners registered once with `useCallback(fn, [])`. State accessed via `stateRef.current` to avoid stale closures.
- **No state library** — React `useState` + refs is sufficient for this app's complexity
- **CSS custom properties** — All theme colors defined as CSS variables in `App.css`; toggled via `[data-theme]` attribute
- **i18n in callbacks** — Use `i18n.t()` (imported module) inside stable callbacks instead of `t()` from `useTranslation()` to avoid closure staleness

## Troubleshooting

| Issue | Solution |
|---|---|
| App won't close on Windows | Ensure `electron/main.cjs` has the `close` event handler with `forceQuit` flag |
| Icon not showing in dev mode | The `icon` property in `BrowserWindow` options must point to `Assets/icon512.png` |
| MSIX install fails | Install the dev cert first: `npx winapp cert install ./devcert.pfx` (admin) |
| Language change doesn't update menus | Verify `language:change` IPC handler calls `buildMenu()` in `main.cjs` |
| CodeMirror content out of sync | Check the value-comparison sync logic in the `useEffect([value])` hook in `Editor.jsx` |
