const { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme } = require('electron');
const path = require('node:path');
const { ACCEPT } = require('./presets');
const { probe, convert, cancel, cancelAll, version: ffmpegVersion } = require('./ffmpeg');
const settings = require('./settings');
const { version: APP_VERSION } = require('../../package.json');

const isMac = process.platform === 'darwin';
const REPO_URL = 'https://github.com/DavidCortesA/converter-kerygma';

// Deben coincidir con el color de la barra superior en styles.css.
const TITLEBAR = {
  dark: { color: '#0e0f12', symbolColor: '#a3a5ae' },
  light: { color: '#f4f3ef', symbolColor: '#5d5f68' },
};

// Textos de los diálogos nativos (el resto de la interfaz se traduce en el renderer).
const DIALOG_TEXT = {
  es: { pickFiles: 'Selecciona archivos', pickFolder: 'Elige dónde guardar', video: 'Videos', audio: 'Audio', extract: 'Videos', image: 'Imágenes' },
  en: { pickFiles: 'Select files', pickFolder: 'Choose where to save', video: 'Videos', audio: 'Audio', extract: 'Videos', image: 'Images' },
};

let win;

function overlayColors() {
  return TITLEBAR[nativeTheme.shouldUseDarkColors ? 'dark' : 'light'];
}

// El CSS sigue prefers-color-scheme, que Electron toma de themeSource.
function applyTheme() {
  nativeTheme.themeSource = settings.load().theme;
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
  if (win) win.setBackgroundColor(overlayColors().color);
});

async function settingsPayload() {
  return {
    ...settings.load(),
    effectiveLanguage: settings.language(),
    version: APP_VERSION,
    ffmpeg: await ffmpegVersion(),
    electron: process.versions.electron,
  };
}

ipcMain.handle('app:config', () => ({ platform: process.platform, accept: ACCEPT, version: APP_VERSION }));

ipcMain.handle('settings:get', settingsPayload);

ipcMain.handle('settings:set', (_e, patch) => {
  if (!patch || typeof patch !== 'object') return settingsPayload();
  settings.update(patch);
  if ('theme' in patch) applyTheme();
  return settingsPayload();
});

ipcMain.handle('settings:reset', () => {
  settings.reset();
  applyTheme();
  return settingsPayload();
});

ipcMain.handle('app:open-repo', () => shell.openExternal(REPO_URL));

ipcMain.handle('files:pick', async (_e, kind) => {
  if (!ACCEPT[kind]) return [];
  const text = DIALOG_TEXT[settings.language()];
  const res = await dialog.showOpenDialog(win, {
    title: text.pickFiles,
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: text[kind], extensions: ACCEPT[kind] }],
  });
  return res.canceled ? [] : res.filePaths;
});

ipcMain.handle('folder:pick', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: DIALOG_TEXT[settings.language()].pickFolder,
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
}, { overwrite: settings.load().existing === 'overwrite' }));

ipcMain.handle('convert:cancel', (_e, id) => cancel(id));

ipcMain.handle('shell:reveal', (_e, file) => {
  if (typeof file === 'string') shell.showItemInFolder(file);
});

app.whenReady().then(() => {
  applyTheme();
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
