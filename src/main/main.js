const path = require('path');
const http = require('http');

let electron;
try {
    electron = require('electron');
} catch (e) {
    // Cannot find module 'electron' when running in plain node
    electron = null;
}

const isHeadless = !electron || typeof electron === 'string' || !electron.app;

if (isHeadless) {
    console.log("Running in Headless Mode (Web Service)");

    // Start a dummy HTTP server to satisfy Render's port binding requirement
    const port = process.env.PORT || 10000;
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Radio Assistant Web Service is running.\n');
    });

    server.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });

    // We can also initialize core headless services here if needed, like the SDR bridge
    try {
        require('../services/sdr-bridge-service.js');
        console.log("SDR Bridge initialized in headless mode.");
    } catch (e) {
        console.error("Failed to initialize SDR Bridge in headless mode:", e);
    }

} else {
    console.log("Running in Electron GUI Mode");
    const { app, BrowserWindow } = electron;

    function createWindow() {
        const win = new BrowserWindow({
            width: 1100,
            height: 800,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        win.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    app.whenReady().then(() => {
        createWindow();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
}
