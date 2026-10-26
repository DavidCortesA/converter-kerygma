const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('kerygma', {
  getConfig: () => ipcRenderer.invoke('app:config'),
  pickFiles: (kind) => ipcRenderer.invoke('files:pick', kind),
  pickFolder: () => ipcRenderer.invoke('folder:pick'),
  probe: (paths) => ipcRenderer.invoke('files:probe', paths),
  convert: (job) => ipcRenderer.invoke('convert:run', job),
  cancel: (id) => ipcRenderer.invoke('convert:cancel', id),
  reveal: (file) => ipcRenderer.invoke('shell:reveal', file),
  pathForFile: (file) => webUtils.getPathForFile(file),
  onProgress: (cb) => {
    const listener = (_e, data) => cb(data);
    ipcRenderer.on('convert:progress', listener);
    return () => ipcRenderer.removeListener('convert:progress', listener);
  },
});
