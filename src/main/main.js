const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Import services to host them in the Main process
const RadioService = require('../services/radio-service.js');
const AIService = require('../services/ai-service.js');
const DecoderService = require('../services/decoder-service.js');
const CollectionService = require('../services/collection-service.js');
const SDRBridgeService = require('../services/sdr-bridge-service.js');

const services = {
    '../services/radio-service.js': RadioService,
    '../services/ai-service.js': AIService,
    '../services/decoder-service.js': DecoderService,
    '../services/collection-service.js': CollectionService,
    '../services/sdr-bridge-service.js': SDRBridgeService
};

// Handle service method calls from Renderer
ipcMain.handle('service-invoke', async (event, { modulePath, method, args }) => {
    const service = services[modulePath];
    if (!service) throw new Error(`Unauthorized service: ${modulePath}`);
    if (typeof service[method] !== 'function') {
        throw new Error(`Method ${method} not found on service ${modulePath}`);
    }
    return await service[method](...args);
});

// Provide initial states to Renderer synchronously
ipcMain.on('get-all-states-sync', (event) => {
    const states = {};
    for (const [path, service] of Object.entries(services)) {
        if (typeof service.getState === 'function') {
            states[path] = service.getState();
        } else if (service.state) {
            states[path] = service.state;
        }
    }
    event.returnValue = states;
});

// Setup event forwarding once for all singleton services
for (const [modulePath, service] of Object.entries(services)) {
    if (typeof service.on === 'function') {
        const originalEmit = service.emit.bind(service);
        service.emit = (event, ...args) => {
            const result = originalEmit(event, ...args);
            // Broadcast to all open windows
            const windows = BrowserWindow.getAllWindows();
            for (const win of windows) {
                if (!win.isDestroyed()) {
                    win.webContents.send('service-event', { modulePath, event, args });
                }
            }
            return result;
        };
    }
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1100,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            preload: path.join(__dirname, 'preload.js')
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
