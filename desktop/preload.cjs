// Expõe ao app apenas a informação de que ele está rodando no desktop.
const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('datalingoDesktop', {
  platform: process.platform,
  version: process.versions.electron,
});
