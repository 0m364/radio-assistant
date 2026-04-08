const assert = require('node:assert');
const RadioService = require('../src/services/radio-service.js');

async function runTests() {
    console.log("Running Radio Service Tests...");

    const initialState = { ...RadioService.getState() };
    const originalMathRandom = Math.random;

    try {
        // Mock Math.random to return 0.5 for deterministic results
        Math.random = () => 0.5;

        // Test Case 1: Signal detection at 11.175 MHz (HFGCS)
        console.log("- Test: Signal detection at 11.175 MHz");
        RadioService.setFrequency(11175000);
        let state = RadioService.getState();
        // In calculateSignalMetrics: jitter = (0.5 * 4) - 2 = 0. match.rssi = -55.
        assert.strictEqual(state.rssi, -55, "RSSI should be -55 dBm at 11.175 MHz");
        assert.strictEqual(state.snr, 20, "SNR should be 20 dB at 11.175 MHz");
        assert.strictEqual(state.isSignalPresent, true, "isSignalPresent should be true at 11.175 MHz");

        // Test Case 2: Background noise at 10.000 MHz
        console.log("- Test: Background noise at 10.000 MHz");
        RadioService.setFrequency(10000000);
        state = RadioService.getState();
        // In calculateSignalMetrics: noiseJitter = (0.5 * 10) - 5 = 0. noiseBase = -115.
        assert.strictEqual(state.rssi, -115, "RSSI should be -115 dBm at 10 MHz");
        assert.strictEqual(state.snr, 0, "SNR should be 0 dB at 10 MHz");
        assert.strictEqual(state.isSignalPresent, false, "isSignalPresent should be false at 10 MHz");

        // Test Case 3: Subscriber notification
        console.log("- Test: Subscriber notification");
        let notifiedState = null;
        const unsubscribe = RadioService.subscribe((s) => {
            notifiedState = { ...s };
        });

        // Change frequency to trigger updateSignalMetrics and notify
        RadioService.setFrequency(8992000); // HFGCS Backup
        assert.ok(notifiedState, "Subscriber should have been notified");
        assert.strictEqual(notifiedState.frequency, 8992000, "Notified state should reflect new frequency");
        // match.rssi for 8.992 MHz is -65. jitter = 0.
        assert.strictEqual(notifiedState.rssi, -65, "Notified state should reflect updated RSSI");

        unsubscribe();

        console.log("\nAll Radio Service tests passed!");
    } catch (error) {
        console.error("\nTests FAILED!");
        console.error(error);
        process.exit(1);
    } finally {
        // Restore original state and Math.random
        RadioService.setFrequency(initialState.frequency);
        RadioService.setMode(initialState.mode);
        RadioService.setBandwidth(initialState.bandwidth);
        RadioService.setActive(initialState.active);
        Math.random = originalMathRandom;
    }
}

runTests();
