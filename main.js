const { app, BrowserWindow, ipcMain, dialog, session, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { startServer } = require('./server');

const STATIC_DIR = path.join(__dirname, 'www');
const IMAGE_FILTERS = [
  { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp'] },
];

let mainWindow;
let dataDir;
let serverPort;

// Images chosen via "Choose Image" get copied here so the local server can
// serve them without ever writing inside the (read-only, once packaged) app
// bundle.
function ensureDataDir() {
  dataDir = path.join(app.getPath('userData'), 'data');
  fs.mkdirSync(dataDir, { recursive: true });
}

function setupDownloadHandler() {
  session.defaultSession.on('will-download', (event, item) => {
    const savePath = dialog.showSaveDialogSync(mainWindow, {
      title: 'Save risograph image',
      defaultPath: path.join(app.getPath('downloads'), item.getFilename()),
    });
    if (savePath) {
      item.setSavePath(savePath);
    } else {
      item.cancel();
    }
  });
}

ipcMain.handle('choose-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose an image',
    properties: ['openFile'],
    filters: IMAGE_FILTERS,
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const sourcePath = result.filePaths[0];
  const filename = path.basename(sourcePath);
  fs.copyFileSync(sourcePath, path.join(dataDir, filename));
  return filename;
});

async function createWindow() {
  ensureDataDir();
  setupDownloadHandler();

  const { port } = await startServer(STATIC_DIR, dataDir);
  serverPort = port;

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 720,
    minHeight: 480,
    title: 'Riso at Home',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${serverPort}/index.html`);

  // Open external links (e.g. the Help icon) in the system browser instead
  // of navigating the app window away from the tool. The Help link is a
  // plain <a href>, which Electron treats as top-level navigation rather
  // than a new-window request, so it needs its own handler.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`http://127.0.0.1:${serverPort}`)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

const menuTemplate = [
  {
    label: app.name,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'quit' },
    ],
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
    ],
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'toggledevtools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  },
  {
    label: 'Window',
    submenu: [{ role: 'minimize' }, { role: 'close' }],
  },
];

app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
