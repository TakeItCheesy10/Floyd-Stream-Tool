const { app, BrowserWindow, dialog, Tray, Menu, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
function logLifecycle(message) {
    try { const dir=path.join(resolveBaseDir(),'.floyd-state');fs.mkdirSync(dir,{recursive:true});fs.appendFileSync(path.join(dir,'runtime.log'),new Date().toISOString()+' '+message+'\n'); } catch {}
}
const { startServer, resolveBaseDir } = require('./server');
// Keep strong references: the window and tray own the local broadcast session.
let service, mainWindow, tray, quitting = false;
if (require('electron-squirrel-startup')) app.quit();
const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();
if (singleInstance) { logLifecycle('Starting process '+process.pid); process.on('exit',code=>logLifecycle('Process exit '+code)); app.on('child-process-gone',(_event,details)=>logLifecycle('Child process stopped: '+JSON.stringify(details))); }
function showWindow() {
    if (!mainWindow) createWindow();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
}
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280, height: 900, minWidth: 940, minHeight: 620,
        title: 'Floyd Stream Tool',
        webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true }
    });
    mainWindow.removeMenu();
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (new URL(url).origin !== service.url) event.preventDefault();
    });
    mainWindow.on('close', event => {
        if (!quitting && tray) { event.preventDefault(); mainWindow.hide(); }
    });
    mainWindow.on('closed', () => { mainWindow = null; });
    mainWindow.loadURL(service.url);
}
function createTray() {
    const icon = nativeImage.createFromPath(path.join(resolveBaseDir(), 'Resources', 'Branding', 'floyd-bronco.png')).resize({ width: 20, height: 20 });
    tray = new Tray(icon);
    tray.setToolTip('Floyd Stream Tool · broadcast server running');
    tray.setContextMenu(Menu.buildFromTemplate([
        { label: 'Open Floyd Stream Tool', click: showWindow },
        { label: 'Closing the window keeps OBS connected', enabled: false },
        { type: 'separator' },
        { label: 'Quit Floyd Stream Tool', click: () => app.quit() }
    ]));
    tray.on('double-click', showWindow);
}
app.on('second-instance', () => { if (service) showWindow(); });
if (singleInstance) app.whenReady().then(async () => {
    try { service = await startServer(); logLifecycle('Server listening '+service.url); createTray(); createWindow(); }
    catch (error) { dialog.showErrorBox('Floyd Stream Tool could not start', error.message); app.quit(); }
});
app.on('activate', () => { if (service) showWindow(); });
app.on('window-all-closed', () => { /* Tray keeps the local server running until explicit Quit. */ });
app.on('before-quit', () => { logLifecycle('Explicit app quit'); quitting = true; service?.server.close(); tray?.destroy(); tray = null; });
