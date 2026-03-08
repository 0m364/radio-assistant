const assert = require('node:assert');
const EventEmitter = require('events');
const Module = require('module');

// --- Mocking Dependencies ---

// Save original load
const originalLoad = Module._load;

// Mock 'ws' and 'net' to prevent SDRBridgeService from trying to start a real server or connect
Module._load = function(request, parent, isMain) {
    if (request === 'ws') {
        console.log('Mocking ws');
        return {
            Server: class extends EventEmitter {
                constructor() {
                    super();
                    setTimeout(() => this.emit('listening'), 0);
                }
            }
        };
    }
    if (request === 'net') {
        console.log('Mocking net');
        return {
            Socket: class extends EventEmitter {
                connect() { return this; }
                destroy() { return this; }
                write() { return true; }
            }
        };
    }
    return originalLoad.apply(this, arguments);
};

// --- Import Actual Services ---

const RadioService = require('../src/services/radio-service.js');
const sdrBridgeService = require('../src/services/sdr-bridge-service.js');

function runTests() {
    console.log('Running SDR Bridge Service Tests (on actual implementation)...');

    const initialState = { ...RadioService.getState() };

    // Test: Valid sdr_state update
    console.log('- Test: Valid sdr_state update');
    sdrBridgeService.handleWsMessage({
        type: 'sdr_state',
        frequency: 14200000,
        mode: 'USB'
    });
    let state = RadioService.getState();
    assert.strictEqual(state.frequency, 14200000);
    assert.strictEqual(state.mode, 'USB');

    // Test: Invalid frequency (string)
    console.log('- Test: Invalid frequency (string) - should be ignored');
    sdrBridgeService.handleWsMessage({
        type: 'sdr_state',
        frequency: '15000000'
    });
    state = RadioService.getState();
    assert.strictEqual(state.frequency, 14200000, 'Frequency should not have changed');

    // Test: Invalid frequency (negative)
    console.log('- Test: Invalid frequency (negative) - should be ignored');
    sdrBridgeService.handleWsMessage({
        type: 'sdr_state',
        frequency: -100
    });
    state = RadioService.getState();
    assert.strictEqual(state.frequency, 14200000, 'Frequency should not have changed');

    // Test: Invalid frequency (NaN/Infinity)
    console.log('- Test: Invalid frequency (NaN/Infinity) - should be ignored');
    sdrBridgeService.handleWsMessage({
        type: 'sdr_state',
        frequency: Infinity
    });
    state = RadioService.getState();
    assert.strictEqual(state.frequency, 14200000, 'Frequency should not have changed');

    // Test: Invalid mode (object)
    console.log('- Test: Invalid mode (object) - should be ignored');
    sdrBridgeService.handleWsMessage({
        type: 'sdr_state',
        mode: { malicious: 'data' }
    });
    state = RadioService.getState();
    assert.strictEqual(state.mode, 'USB', 'Mode should not have changed');

    // Test: Invalid mode (empty string)
    console.log('- Test: Invalid mode (empty string) - should be ignored');
    sdrBridgeService.handleWsMessage({
        type: 'sdr_state',
        mode: ''
    });
    state = RadioService.getState();
    assert.strictEqual(state.mode, 'USB', 'Mode should not have changed');

    // Test: Malformed message (not an object)
    console.log('- Test: Malformed message (not an object) - should be ignored');
    sdrBridgeService.handleWsMessage("malicious string");
    sdrBridgeService.handleWsMessage(null);
    sdrBridgeService.handleWsMessage([1, 2, 3]);
    state = RadioService.getState();
    assert.strictEqual(state.frequency, 14200000);
    assert.strictEqual(state.mode, 'USB');

    // Test: Unknown message type
    console.log('- Test: Unknown message type - should be ignored');
    sdrBridgeService.handleWsMessage({
        type: 'unknown_type',
        frequency: 10000000
    });
    state = RadioService.getState();
    assert.strictEqual(state.frequency, 14200000);

    // Restore initial state
    RadioService.setFrequency(initialState.frequency);
    RadioService.setMode(initialState.mode);

    console.log('\nAll SDR Bridge Service tests passed!');
}

runTests();

// Cleanup mock
Module._load = originalLoad;

process.exit(0);
