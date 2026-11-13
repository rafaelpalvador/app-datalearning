// Expõe ao app só o necessário: a plataforma, a versão e as atualizações.
const { contextBridge, ipcRenderer } = require('electron');

const on = (channel, cb) => {
  const fn = (_e, data) => cb(data);
  ipcRenderer.on(channel, fn);
  return () => ipcRenderer.removeListener(channel, fn);
};

contextBridge.exposeInMainWorld('datalingoDesktop', {
  platform: process.platform,
  version: process.versions.electron,
  appVersion: ipcRenderer.sendSync('app:version'),
  updates: {
    check: () => ipcRenderer.invoke('update:check'),
    install: () => ipcRenderer.invoke('update:install'),
    openPage: () => ipcRenderer.invoke('update:open'),
    onAvailable: (cb) => on('update:available', cb),
    onProgress: (cb) => on('update:progress', cb),
    onOpenPanel: (cb) => on('update:open-panel', cb),
  },
});
