const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const i18n = require('./i18n-main.cjs');

const isDev = !app.isPackaged;
let mainWindow;
let forceQuit = false;

function createWindow() {
  const isMac = process.platform === 'darwin';
  const isWindows = process.platform === 'win32';

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    show: false,
    icon: path.join(__dirname, '..', 'Assets', 'icon512.png'),
    backgroundColor: '#2d3748',
    title: 'Markdown Writer',
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

    e.preventDefault();

    mainWindow.webContents
      .executeJavaScript('document.title.startsWith("●")')
      .then((hasUnsaved) => {
        if (!hasUnsaved) {
          forceQuit = true;
          mainWindow.close();
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
          const closeAfterSave = () => {
            forceQuit = true;
            mainWindow.close();
          };
          ipcMain.once('save:complete', closeAfterSave);
          setTimeout(() => ipcMain.removeListener('save:complete', closeAfterSave), 30000);
        } else if (result.response === 1) {
          // Don't Save — force close
          forceQuit = true;
          mainWindow.close();
        }
      })
      .catch(() => {
        forceQuit = true;
        mainWindow.close();
      });
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

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const t = i18n.t.bind(i18n);

  const template = [
    ...(isMac
      ? [{ label: app.name, submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }] }]
      : []),
    {
      label: t('menu.file'),
      submenu: [
        { label: t('menu.new'), accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu:new') },
        { label: t('menu.open'), accelerator: 'CmdOrCtrl+O', click: () => mainWindow?.webContents.send('menu:open') },
        { type: 'separator' },
        { label: t('menu.save'), accelerator: 'CmdOrCtrl+S', click: () => mainWindow?.webContents.send('menu:save') },
        { label: t('menu.saveAs'), accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow?.webContents.send('menu:save-as') },
        { type: 'separator' },
        { label: t('menu.exportHtml'), accelerator: 'CmdOrCtrl+Shift+E', click: () => mainWindow?.webContents.send('menu:export-html') },
        { label: t('menu.exportPdf'), accelerator: 'CmdOrCtrl+Shift+P', click: () => mainWindow?.webContents.send('menu:export-pdf') },
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
        { label: t('menu.bold'), accelerator: 'CmdOrCtrl+B', click: () => mainWindow?.webContents.send('menu:format', 'bold') },
        { label: t('menu.italic'), accelerator: 'CmdOrCtrl+I', click: () => mainWindow?.webContents.send('menu:format', 'italic') },
      ],
    },
    {
      label: t('menu.view'),
      submenu: [
        { label: t('menu.toggleDarkMode'), accelerator: 'CmdOrCtrl+Shift+D', click: () => mainWindow?.webContents.send('menu:toggle-theme') },
        { type: 'separator' },
        {
          label: t('menu.language'),
          submenu: [
            { label: 'English', type: 'radio', checked: i18n.language === 'en', click: () => mainWindow?.webContents.send('menu:language', 'en') },
            { label: 'Español', type: 'radio', checked: i18n.language === 'es', click: () => mainWindow?.webContents.send('menu:language', 'es') },
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
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// --- IPC: file operations ---

ipcMain.handle('file:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: i18n.t('filter.markdown'), extensions: ['md', 'markdown', 'txt'] },
      { name: i18n.t('filter.allFiles'), extensions: ['*'] },
    ],
  });
  if (result.canceled) return null;
  const filePath = result.filePaths[0];
  const content = await fs.promises.readFile(filePath, 'utf-8');
  return { filePath, content };
});

ipcMain.handle('file:save', async (_event, { content, filePath }) => {
  let savePath = filePath;
  if (!savePath) {
    const result = await dialog.showSaveDialog(mainWindow, {
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
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: title.replace(/\.md$/i, '') + '.html',
    filters: [{ name: i18n.t('filter.html'), extensions: ['html'] }],
  });
  if (result.canceled) return null;
  await fs.promises.writeFile(result.filePath, fullHtml, 'utf-8');
  return result.filePath;
});

ipcMain.handle('export:pdf', async (_event, { html, title }) => {
  const fullHtml = wrapHtmlTemplate(html, title);
  const result = await dialog.showSaveDialog(mainWindow, {
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
  createWindow();
  buildMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
