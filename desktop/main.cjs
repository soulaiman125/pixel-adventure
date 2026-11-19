const { app, BrowserWindow, net, protocol, session } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const scheme = 'pixel';
const entry = 'pixel://game/index.html';
const root = path.resolve(__dirname, '../dist');
const policy = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";
protocol.registerSchemesAsPrivileged([
  { scheme, privileges: { standard: true, secure: true, supportFetchAPI: true, codeCache: true } },
]);

function localFile(request) {
  try {
    const url = new URL(request.url);
    if (url.hostname !== 'game' || request.method !== 'GET') return null;
    const resource = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = path.resolve(root, '.' + resource);
    const relative = path.relative(root, file);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;
    return file;
  } catch {
    return null;
  }
}

function canEnterFullscreen(contents, permission, details) {
  return permission === 'fullscreen' && details.isMainFrame &&
    details.requestingUrl === entry && contents?.getURL() === entry;
}

function openGame() {
  const window = new BrowserWindow({
    width: 1320,
    height: 890,
    minWidth: 360,
    minHeight: 400,
    title: `Pixel Adventure ${app.getVersion()}`,
    icon: path.join(__dirname, 'icon.ico'),
    backgroundColor: '#101822',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  window.on('page-title-updated', event => event.preventDefault());
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== entry) event.preventDefault();
  });
  window.loadURL(entry);
}

app.whenReady().then(() => {
  if (process.platform === 'win32') app.setAppUserModelId('com.pixeladventure.game');
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback, details) => {
    callback(canEnterFullscreen(contents, permission, details));
  });
  session.defaultSession.setPermissionCheckHandler((contents, permission, _origin, details) =>
    canEnterFullscreen(contents, permission, details));
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] },
    (_details, callback) => callback({ cancel: true }));
  protocol.handle(scheme, async (request) => {
    const file = localFile(request);
    if (!file) return new Response('Not found', { status: 404 });
    try {
      const response = await net.fetch(pathToFileURL(file).href);
      const headers = new Headers(response.headers);
      headers.set('Content-Security-Policy', policy);
      return new Response(response.body, { status: response.status, headers });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
  openGame();
});

app.on('window-all-closed', () => app.quit());
