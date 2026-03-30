const assert = require('node:assert');
const radioService = require('../src/services/radio-service.js');
const SIMULATED_TRAFFIC = require('../src/common/simulated-traffic.js');

function runTests() {
    console.log("Running Radio Service Tests...");

    const originalRandom = Math.random;
    // Mock Math.random for deterministic jitter (jitter = 0)
    Math.random = () => 0.5;

    try {
        // Test Case 1: Exact match
        console.log("- Test: Exact match (11.175 MHz)");
        const freq1 = 11175000;
        const metrics1 = radioService.calculateSignalMetrics(freq1);
        const match1 = SIMULATED_TRAFFIC.find(t => t.frequency === freq1);
        assert.strictEqual(metrics1.present, true);
        assert.strictEqual(metrics1.rssi, match1.rssi); // jitter = 0
        assert.strictEqual(metrics1.snr, 20); // 20 + jitter
        assert.strictEqual(metrics1.signalType, match1.type);

        // Test Case 2: Match within tolerance (4.999 kHz)
        console.log("- Test: Match within tolerance (+4999 Hz)");
        const freq2 = 11175000 + 4999;
        const metrics2 = radioService.calculateSignalMetrics(freq2);
        assert.strictEqual(metrics2.present, true);
        assert.strictEqual(metrics2.signalType, match1.type);

        // Test Case 3: Exactly at boundary (5000 Hz) - should NOT match (uses < 5000)
        console.log("- Test: Boundary case (5000 Hz) - No Match");
        const freq3 = 11175000 + 5000;
        const metrics3 = radioService.calculateSignalMetrics(freq3);
        assert.strictEqual(metrics3.present, false);
        assert.strictEqual(metrics3.rssi, -115); // noiseBase = -115, noiseJitter = 0
        assert.strictEqual(metrics3.snr, 0);

        // Test Case 4: No match (background noise)
        console.log("- Test: No match (100 MHz)");
        const freq4 = 100000000;
        const metrics4 = radioService.calculateSignalMetrics(freq4);
        assert.strictEqual(metrics4.present, false);
        assert.strictEqual(metrics4.rssi, -115);
        assert.strictEqual(metrics4.snr, 0);
        assert.strictEqual(metrics4.signalType, null);

        // Test Case 5: Different jitter
        console.log("- Test: Non-zero jitter");
        Math.random = () => 0.75; // jitter = (0.75 * 4) - 2 = 1
        const metrics5 = radioService.calculateSignalMetrics(freq1);
        assert.strictEqual(metrics5.rssi, match1.rssi + 1);
        assert.strictEqual(metrics5.snr, 21);

        console.log("\nAll Radio Service tests passed!");
    } catch (error) {
        console.error("\nTests FAILED!");
        console.error(error);
        process.exit(1);
    } finally {
        Math.random = originalRandom;
    }
}

runTests();
