const { contextBridge, ipcRenderer } = require('electron');

class EventEmitter {
    constructor() { this.listeners = {}; }
    on(event, cb) { (this.listeners[event] = this.listeners[event] || []).push(cb); return this; }
    once(event, cb) {
        const wrapper = (...args) => { cb(...args); this.off(event, wrapper); };
        return this.on(event, wrapper);
    }
    off(event, cb) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(l => l !== cb);
        }
        return this;
    }
    emit(event, ...args) {
        if (this.listeners[event]) {
            this.listeners[event].slice().forEach(cb => cb(...args));
        }
        return true;
    }
    removeAllListeners(event) {
        if (event) delete this.listeners[event];
        else this.listeners = {};
        return this;
    }
}

// Fetch initial states from Main process synchronously
const initialStates = ipcRenderer.sendSync('get-all-states-sync');

const serviceProxies = {};

contextBridge.exposeInMainWorld('electronAPI', {
    requireService: (modulePath) => {
        if (serviceProxies[modulePath]) return serviceProxies[modulePath];

        const emitter = new EventEmitter();
        const state = initialStates[modulePath] || {};

        const proxy = new Proxy(emitter, {
            get(target, prop) {
                if (prop in target) return target[prop];
                if (prop === 'getState') return () => state;
                if (prop === 'state') return state;
                if (prop === 'subscribe') {
                    return (listener) => {
                        emitter.on('state-update', listener);
                        listener(state);
                        return () => emitter.off('state-update', listener);
                    };
                }

                // Default: invoke method in Main process
                return (...args) => ipcRenderer.invoke('service-invoke', { modulePath, method: prop, args });
            }
        });

        serviceProxies[modulePath] = proxy;
        return proxy;
    },
    EventEmitter: EventEmitter
});

// Handle events from Main process
ipcRenderer.on('service-event', (event, { modulePath, event: eventName, args }) => {
    const proxy = serviceProxies[modulePath];
    if (proxy) {
        // Update local state if it's a state-update event
        if (eventName === 'state-update' && args[0]) {
            Object.assign(initialStates[modulePath], args[0]);
        }
        proxy.emit(eventName, ...args);
    }
});
