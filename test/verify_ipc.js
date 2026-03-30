const assert = require('node:assert');
const test = require('node:test');
const Module = require('module');

// Mock Electron Environment
const ipcHandlers = {};
const ipcListeners = {};
let syncReturnValue = {};

const ipcRenderer = {
    sendSync: (channel) => {
        if (channel === 'get-all-states-sync') return syncReturnValue;
        return null;
    },
    invoke: async (channel, data) => {
        if (channel === 'service-invoke') {
            const handler = ipcHandlers[data.modulePath + '.' + data.method];
            if (handler) return handler(...data.args);
        }
    },
    on: (channel, cb) => {
        ipcListeners[channel] = cb;
    }
};

const contextBridge = {
    exposeInMainWorld: (name, obj) => {
        global[name] = obj;
    }
};

// Use Module._load to intercept electron require
const originalLoad = Module._load;
Module._load = function(request, parent) {
    if (request === 'electron') {
        return { ipcRenderer, contextBridge };
    }
    return originalLoad.apply(this, arguments);
};

// Load preload.js
require('../src/main/preload.js');

test('Preload IPC Bridge', async (t) => {
    const modulePath = '../services/radio-service.js';
    syncReturnValue[modulePath] = { frequency: 11175000 };

    await t.test('Initial state is captured', () => {
        const service = global.electronAPI.requireService(modulePath);
        assert.strictEqual(service.getState().frequency, 11175000);
    });

    await t.test('Method calls are routed to IPC invoke', async () => {
        const service = global.electronAPI.requireService(modulePath);
        ipcHandlers[modulePath + '.setFrequency'] = (freq) => {
            return `Tuned to ${freq}`;
        };

        const result = await service.setFrequency(14074000);
        assert.strictEqual(result, 'Tuned to 14074000');
    });

    await t.test('Events are propagated from IPC', () => {
        const service = global.electronAPI.requireService(modulePath);
        let receivedState = null;
        service.on('state-update', (state) => {
            receivedState = state;
        });

        // Simulate IPC event
        const newState = { frequency: 14074000 };
        ipcListeners['service-event'](null, { modulePath, event: 'state-update', args: [newState] });

        assert.deepStrictEqual(receivedState, newState);
        assert.strictEqual(service.getState().frequency, 14074000);
    });

    await t.test('Subscribe pattern works', () => {
        const service = global.electronAPI.requireService(modulePath);
        let receivedState = null;
        const unsubscribe = service.subscribe((state) => {
            receivedState = state;
        });

        assert.strictEqual(receivedState.frequency, 14074000);

        const nextState = { frequency: 7074000 };
        ipcListeners['service-event'](null, { modulePath, event: 'state-update', args: [nextState] });

        assert.strictEqual(receivedState.frequency, 7074000);
        unsubscribe();
    });
});
