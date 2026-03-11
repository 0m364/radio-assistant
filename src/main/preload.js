const { contextBridge } = require('electron');

const RadioService = require('../services/radio-service.js');
const AIService = require('../services/ai-service.js');
const DecoderService = require('../services/decoder-service.js');
const CollectionService = require('../services/collection-service.js');
const SDRBridgeService = require('../services/sdr-bridge-service.js');

const safeServices = {
    '../services/radio-service.js': RadioService,
    '../services/ai-service.js': AIService,
    '../services/decoder-service.js': DecoderService,
    '../services/collection-service.js': CollectionService,
    '../services/sdr-bridge-service.js': SDRBridgeService
};

contextBridge.exposeInMainWorld('electronAPI', {
    requireService: (modulePath) => {
        if (safeServices.hasOwnProperty(modulePath)) {
            const service = safeServices[modulePath];
            const proxy = {};
            const listenerMap = new WeakMap();

            for (const key in service) {
                if (typeof service[key] === 'function') {
                    if (key === 'on' || key === 'once') {
                        proxy[key] = (event, listener) => {
                            let wrapper = listenerMap.get(listener);
                            if (!wrapper) {
                                wrapper = (...args) => listener(...args);
                                listenerMap.set(listener, wrapper);
                            }
                            service[key](event, wrapper);
                            return proxy;
                        };
                    } else if (key === 'off' || key === 'removeListener') {
                        proxy[key] = (event, listener) => {
                            const wrapper = listenerMap.get(listener);
                            if (wrapper) {
                                service[key](event, wrapper);
                            }
                            return proxy;
                        };
                    } else if (key === 'emit') {
                        proxy[key] = (event, ...args) => service.emit(event, ...args);
                    } else if (key === 'removeAllListeners') {
                        proxy[key] = (event) => service.removeAllListeners(event);
                    } else {
                        proxy[key] = service[key].bind(service);
                    }
                } else {
                    Object.defineProperty(proxy, key, {
                        get: () => service[key],
                        enumerable: true
                    });
                }
            }

            const proto = Object.getPrototypeOf(service);
            if (proto) {
                for (const key of Object.getOwnPropertyNames(proto)) {
                    if (key !== 'constructor' && typeof service[key] === 'function' && !proxy[key]) {
                        proxy[key] = service[key].bind(service);
                    }
                }
            }

            return proxy;
        }
        throw new Error("Unauthorized service: " + modulePath);
    },

    // Polyfill EventEmitter for renderer scripts so they don't break when contextIsolation strips classes
    createEventEmitter: () => {
        return class EventEmitter {
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
        };
    }
});
