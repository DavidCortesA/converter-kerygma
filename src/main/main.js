const { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme } = require('electron');
const path = require('node:path');
const { ACCEPT } = require('./presets');
const { probe, convert, cancel, cancelAll } = require('./ffmpeg');

const isMac = process.platform === 'darwin';

// Deben coincidir con el color de la barra superior en styles.css.
const TITLEBAR = {
  dark: { color: '#0e0f12', symbolColor: '#a3a5ae' },
  light: { color: '#f4f3ef', symbolColor: '#5d5f68' },
};

let win;

function overlayColors() {
  return TITLEBAR[nativeTheme.shouldUseDarkColors ? 'dark' : 'light'];
}

function createWindow() {
  win = new BrowserWindow({
    width: 1120,
    height: 820,
    minWidth: 880,
    minHeight: 600,
    title: 'Kerygma Converter',
    // En el paquete, Windows toma el ícono del .exe; esto cubre el modo desarrollo.
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    backgroundColor: overlayColors().color,
    show: false,
    titleBarStyle: 'hidden',
    ...(isMac
      ? { trafficLightPosition: { x: 18, y: 18 } }
      : { titleBarOverlay: { ...overlayColors(), height: 52 } }),
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // La app nunca navega fuera de su propia página (p. ej. al soltar un archivo).
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

nativeTheme.on('updated', () => {
  if (win && !isMac) win.setTitleBarOverlay({ ...overlayColors(), height: 52 });
});

const FILTER_NAMES = { video: 'Videos', audio: 'Audio', extract: 'Videos', image: 'Imágenes' };

ipcMain.handle('app:config', () => ({ platform: process.platform, accept: ACCEPT, version: app.getVersion() }));

ipcMain.handle('files:pick', async (_e, kind) => {
  if (!ACCEPT[kind]) return [];
  const res = await dialog.showOpenDialog(win, {
    title: 'Selecciona archivos',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: FILTER_NAMES[kind], extensions: ACCEPT[kind] }],
  });
  return res.canceled ? [] : res.filePaths;
});

ipcMain.handle('folder:pick', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Elige dónde guardar',
    properties: ['openDirectory', 'createDirectory'],
  });
  return res.canceled ? null : res.filePaths[0];
});

ipcMain.handle('files:probe', (_e, paths) => {
  if (!Array.isArray(paths)) return [];
  return Promise.all(paths.filter((p) => typeof p === 'string').map(probe));
});

ipcMain.handle('convert:run', (e, job) => convert(job, (progress) => {
  if (!e.sender.isDestroyed()) e.sender.send('convert:progress', progress);
}));

ipcMain.handle('convert:cancel', (_e, id) => cancel(id));

ipcMain.handle('shell:reveal', (_e, file) => {
  if (typeof file === 'string') shell.showItemInFolder(file);
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', cancelAll);

app.on('window-all-closed', () => {
  cancelAll();
  if (!isMac) app.quit();
});
