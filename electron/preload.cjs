const { contextBridge, ipcRenderer } = require('electron');

// Helper: subscribe to a main→renderer channel, return unsubscribe function
function onChannel(channel) {
  return (callback) => {
    const handler = (_event, ...args) => callback(...args);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  };
}

contextBridge.exposeInMainWorld('electronAPI', {
  // Platform identifier ('win32' | 'darwin' | 'linux')
  platform: process.platform,

  // Request/response file operations
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (data) => ipcRenderer.invoke('file:save', data),

  // Export operations
  exportHtml: (data) => ipcRenderer.invoke('export:html', data),
  exportPdf: (data) => ipcRenderer.invoke('export:pdf', data),

  // Notify main process that a save completed (for close-after-save flow)
  notifySaveComplete: () => ipcRenderer.send('save:complete'),

  // Menu event listeners (main→renderer)
  onMenuNew: onChannel('menu:new'),
  onMenuOpen: onChannel('menu:open'),
  onMenuSave: onChannel('menu:save'),
  onMenuSaveAs: onChannel('menu:save-as'),
  onMenuFormat: onChannel('menu:format'),
  onMenuToggleTheme: onChannel('menu:toggle-theme'),
  onMenuExportHtml: onChannel('menu:export-html'),
  onMenuExportPdf: onChannel('menu:export-pdf'),
  onMenuLanguage: onChannel('menu:language'),

  // Language (renderer → main)
  setLanguage: (lng) => ipcRenderer.send('language:change', lng),
});
