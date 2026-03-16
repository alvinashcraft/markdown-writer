const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const i18n = require('./i18n-main.cjs');

const isDev = !app.isPackaged;

// Resolve the user's Documents folder, preferring OneDrive Documents on Windows
function getDocumentsPath() {
  if (process.platform === 'win32') {
    // The OneDrive env var points to the user's OneDrive root when installed
    const oneDriveRoot = process.env.OneDrive;
    if (oneDriveRoot) {
      const oneDriveDocs = path.join(oneDriveRoot, 'Documents');
      try {
        if (fs.statSync(oneDriveDocs).isDirectory()) return oneDriveDocs;
      } catch { /* not found, fall through */ }
    }
  }
  // Fallback: Electron's built-in documents path (works on all platforms)
  return app.getPath('documents');
}

let mainWindow;
let forceQuit = false;
let isQuitting = false;
let currentTitle = 'QuietMark';

// Set the proper app name for macOS menus ("About", app menu title, etc.)
app.name = 'QuietMark';

app.setAboutPanelOptions({
  applicationName: 'QuietMark',
  applicationVersion: '1.0.0',
  copyright: '© 2026 Alvin Ashcraft',
  credits: 'A focused markdown editor with live preview.',
});

function createWindow() {
  const isMac = process.platform === 'darwin';
  const isWindows = process.platform === 'win32';

  const screenshotMode = process.env.SCREENSHOT_MODE === '1';

  forceQuit = false;

  mainWindow = new BrowserWindow({
    width: screenshotMode ? 1280 : 1200,
    height: screenshotMode ? 800 : 800,
    minWidth: 600,
    minHeight: 400,
    show: false,
    ...(screenshotMode && { resizable: false }),
    icon: path.join(__dirname, '..', 'Assets', 'icon512.png'),
    backgroundColor: '#2d3748',
    title: 'QuietMark',
    // Native window material effects
    ...(isMac && {
      vibrancy: 'sidebar',
      visualEffectState: 'active',
      backgroundColor: '#00000000',
    }),
    ...(isWindows && {
      backgroundMaterial: 'mica',
    }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Native close confirmation — prevents silent block from beforeunload
  mainWindow.on('close', (e) => {
    if (forceQuit) return;

    // Capture and reset quit intent so a cancelled dialog doesn't stick
    const wasQuitting = isQuitting;
    isQuitting = false;
    e.preventDefault();

    const proceedWithClose = () => {
      forceQuit = true;
      if (wasQuitting) {
        app.quit();
      } else {
        mainWindow.close();
      }
    };

    mainWindow.webContents
      .executeJavaScript('document.title.startsWith("●")')
      .then((hasUnsaved) => {
        if (!hasUnsaved) {
          proceedWithClose();
          return;
        }

        return dialog.showMessageBox(mainWindow, {
          type: 'warning',
          buttons: [i18n.t('dialog.save'), i18n.t('dialog.dontSave'), i18n.t('dialog.cancel')],
          defaultId: 0,
          cancelId: 2,
          message: i18n.t('dialog.saveChanges'),
          detail: i18n.t('dialog.saveChangesDetail'),
        });
      })
      .then((result) => {
        if (!result) return;

        if (result.response === 0) {
          // Save then close
          mainWindow.webContents.send('menu:save');
          const closeAfterSave = () => proceedWithClose();
          ipcMain.once('save:complete', closeAfterSave);
          setTimeout(() => ipcMain.removeListener('save:complete', closeAfterSave), 30000);
        } else if (result.response === 1) {
          // Don't Save — force close
          proceedWithClose();
        }
      })
      .catch(() => {
        proceedWithClose();
      });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('page-title-updated', (_event, title) => {
    if (currentTitle !== title) {
      currentTitle = title;
      buildMenu();
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      // Dev server not running — fall back to production build
      mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

function ensureMainWindow() {
  if (mainWindow === null || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

// Send IPC to the renderer, recreating the window first if needed
function sendToRenderer(channel, ...args) {
  if (mainWindow === null || mainWindow.isDestroyed()) {
    createWindow();
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.send(channel, ...args);
    });
  } else {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send(channel, ...args);
  }
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const isWindows = process.platform === 'win32';
  const t = i18n.t.bind(i18n);

  const appName = 'QuietMark';
  const template = [
    ...(isMac
      ? [{ label: appName, submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }] }]
      : []),
    {
      label: t('menu.file'),
      submenu: [
        { label: t('menu.new'), accelerator: 'CmdOrCtrl+N', click: () => sendToRenderer('menu:new') },
        { label: t('menu.open'), accelerator: 'CmdOrCtrl+O', click: () => sendToRenderer('menu:open') },
        { type: 'separator' },
        { label: t('menu.save'), accelerator: 'CmdOrCtrl+S', click: () => sendToRenderer('menu:save') },
        { label: t('menu.saveAs'), accelerator: 'CmdOrCtrl+Shift+S', click: () => sendToRenderer('menu:save-as') },
        { type: 'separator' },
        { label: t('menu.exportHtml'), accelerator: 'CmdOrCtrl+Shift+E', click: () => sendToRenderer('menu:export-html') },
        { label: t('menu.exportPdf'), accelerator: 'CmdOrCtrl+Shift+P', click: () => sendToRenderer('menu:export-pdf') },
        { type: 'separator' },
        ...(isMac ? [] : [{ role: 'quit' }]),
      ],
    },
    {
      label: t('menu.edit'),
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        { label: t('menu.bold'), accelerator: 'CmdOrCtrl+B', click: () => sendToRenderer('menu:format', 'bold') },
        { label: t('menu.italic'), accelerator: 'CmdOrCtrl+I', click: () => sendToRenderer('menu:format', 'italic') },
      ],
    },
    {
      label: t('menu.view'),
      submenu: [
        { label: t('menu.toggleDarkMode'), accelerator: 'CmdOrCtrl+Shift+D', click: () => sendToRenderer('menu:toggle-theme') },
        { type: 'separator' },
        {
          label: t('menu.language'),
          submenu: [
            { label: 'English', type: 'radio', checked: i18n.language === 'en', click: () => sendToRenderer('menu:language', 'en') },
            { label: 'Español', type: 'radio', checked: i18n.language === 'es', click: () => sendToRenderer('menu:language', 'es') },
          ],
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
      ],
    },
    ...(isMac
      ? [{
          label: t('menu.window'),
          submenu: [
            { role: 'minimize' },
            { role: 'zoom' },
            { type: 'separator' },
            { label: currentTitle || t('menu.mainWindow'), click: () => ensureMainWindow() },
          ],
        }]
      : []),
    ...(isWindows
      ? [
          {
            label: 'Help',
            submenu: [{ label: 'About QuietMark', click: () => app.showAboutPanel() }],
          },
        ]
      : []),
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// --- IPC: file operations ---

ipcMain.handle('file:read', async (_event, filePath) => {
  try {
    const content = (await fs.promises.readFile(filePath, 'utf-8')).replace(/\r\n/g, '\n');
    return { filePath, content };
  } catch {
    return null;
  }
});

ipcMain.handle('file:open', async () => {
  const parentWindow = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
  const result = await dialog.showOpenDialog(parentWindow, {
    properties: ['openFile'],
    filters: [
      { name: i18n.t('filter.markdown'), extensions: ['md', 'markdown', 'txt'] },
      { name: i18n.t('filter.allFiles'), extensions: ['*'] },
    ],
  });
  if (result.canceled) return null;
  const filePath = result.filePaths[0];
  const content = (await fs.promises.readFile(filePath, 'utf-8')).replace(/\r\n/g, '\n');
  return { filePath, content };
});

ipcMain.handle('file:save', async (_event, { content, filePath }) => {
  let savePath = filePath;
  if (!savePath) {
    const parentWindow = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
    const result = await dialog.showSaveDialog(parentWindow, {
      defaultPath: getDocumentsPath(),
      filters: [
        { name: i18n.t('filter.markdown'), extensions: ['md'] },
        { name: i18n.t('filter.allFiles'), extensions: ['*'] },
      ],
    });
    if (result.canceled) return null;
    savePath = result.filePath;
  }
  await fs.promises.writeFile(savePath, content, 'utf-8');
  return savePath;
});

// --- IPC: export operations ---

const EXPORT_CSS = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    line-height: 1.7;
    color: #1a202c;
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }
  h1, h2, h3, h4, h5, h6 { margin-top: 1.5rem; margin-bottom: 0.75rem; font-weight: 600; line-height: 1.3; }
  h1 { font-size: 2rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; }
  h2 { font-size: 1.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem; }
  h3 { font-size: 1.25rem; }
  p { margin-bottom: 1rem; }
  ul, ol { margin-bottom: 1rem; padding-left: 2rem; }
  li { margin-bottom: 0.25rem; }
  code { background: #edf2f7; padding: 0.125rem 0.375rem; border-radius: 3px; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 0.875em; }
  pre { background: #2d3748; color: #e2e8f0; padding: 1rem; border-radius: 6px; overflow-x: auto; margin-bottom: 1rem; }
  pre code { background: none; padding: 0; color: inherit; }
  blockquote { border-left: 4px solid #4299e1; padding-left: 1rem; margin: 1rem 0; color: #718096; font-style: italic; }
  a { color: #4299e1; text-decoration: none; }
  a:hover { text-decoration: underline; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.5rem 0; }
  img { max-width: 100%; height: auto; }
`;

function wrapHtmlTemplate(html, title) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${EXPORT_CSS}</style>
</head>
<body>
${html}
</body>
</html>`;
}

ipcMain.handle('export:html', async (_event, { html, title }) => {
  const fullHtml = wrapHtmlTemplate(html, title);
  const parentWindow = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
  const result = await dialog.showSaveDialog(parentWindow, {
    defaultPath: title.replace(/\.md$/i, '') + '.html',
    filters: [{ name: i18n.t('filter.html'), extensions: ['html'] }],
  });
  if (result.canceled) return null;
  await fs.promises.writeFile(result.filePath, fullHtml, 'utf-8');
  return result.filePath;
});

ipcMain.handle('export:pdf', async (_event, { html, title }) => {
  const fullHtml = wrapHtmlTemplate(html, title);
  const parentWindow = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
  const result = await dialog.showSaveDialog(parentWindow, {
    defaultPath: title.replace(/\.md$/i, '') + '.pdf',
    filters: [{ name: i18n.t('filter.pdf'), extensions: ['pdf'] }],
  });
  if (result.canceled) return null;

  const hiddenWin = new BrowserWindow({
    show: false,
    width: 800,
    height: 600,
    webPreferences: { offscreen: true },
  });

  return new Promise((resolve, reject) => {
    hiddenWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`);
    hiddenWin.webContents.on('did-finish-load', async () => {
      try {
        const pdfBuffer = await hiddenWin.webContents.printToPDF({
          pageSize: 'A4',
          printBackground: true,
          margins: { top: 1, bottom: 1, left: 1, right: 1 },
        });
        await fs.promises.writeFile(result.filePath, pdfBuffer);
        resolve(result.filePath);
      } catch (err) {
        reject(err);
      } finally {
        hiddenWin.close();
      }
    });
  });
});

// --- IPC: language change ---

ipcMain.on('language:change', (_event, lng) => {
  if (i18n.language !== lng) {
    i18n.changeLanguage(lng);
    buildMenu();
  }
});

// --- App lifecycle ---

app.whenReady().then(() => {
  // Set macOS dock icon in dev mode (in production the bundled .app icon is used)
  if (process.platform === 'darwin' && isDev) {
    app.dock.setIcon(path.join(__dirname, '..', 'Assets', 'icon1024.png'));
  }

  createWindow();
  buildMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
