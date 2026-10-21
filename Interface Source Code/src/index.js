const { app, BrowserWindow, dialog } = require('electron');
const { startServer } = require('./server');
let service;
if (require('electron-squirrel-startup')) app.quit();
function createWindow() {
    const window = new BrowserWindow({
        width: 1060, height: 580, minWidth: 900, minHeight: 510,
        title: 'Floyd Stream Tool',
        webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true }
    });
    window.removeMenu();
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => {
        if (new URL(url).origin !== service.url) event.preventDefault();
    });
    window.loadURL(service.url);
}
app.whenReady().then(async () => {
    try { service = await startServer(); createWindow(); }
    catch (error) { dialog.showErrorBox('Floyd Stream Tool could not start', error.message); app.quit(); }
});
app.on('activate', () => { if (service && BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => service?.server.close());
