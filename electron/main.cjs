const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');

const APP_URL = 'https://he1l.me';
const APP_ORIGIN = new URL(APP_URL).origin;

function isInternalUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.origin === APP_ORIGIN || url.protocol === 'file:';
  } catch {
    return false;
  }
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: 'xe1Signal',
    backgroundColor: '#07080c',
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      partition: 'persist:xe1signal',
    },
  });

  window.once('ready-to-show', () => {
    window.show();
  });

  window.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = webContents.getURL().startsWith(APP_ORIGIN) && permission === 'notifications';
    callback(allowed);
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternalUrl(url)) {
      window.loadURL(url);
    } else {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    if (isInternalUrl(url)) return;
    event.preventDefault();
    void shell.openExternal(url);
  });

  window.webContents.on('did-fail-load', (_event, errorCode, _error, _url, isMainFrame) => {
    if (isMainFrame && errorCode !== -3) {
      void window.loadFile(path.join(__dirname, 'offline.html'));
    }
  });

  window.webContents.on('render-process-gone', () => {
    if (!window.isDestroyed()) window.reload();
  });

  void window.loadURL(APP_URL);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.focus();
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
