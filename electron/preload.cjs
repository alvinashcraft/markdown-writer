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
  // Request/response file operations
  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (data) => ipcRenderer.invoke('file:save', data),

  // Menu event listeners (main→renderer)
  onMenuNew: onChannel('menu:new'),
  onMenuOpen: onChannel('menu:open'),
  onMenuSave: onChannel('menu:save'),
  onMenuSaveAs: onChannel('menu:save-as'),
  onMenuFormat: onChannel('menu:format'),
  onMenuToggleTheme: onChannel('menu:toggle-theme'),
});
