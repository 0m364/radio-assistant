const assert = require('node:assert');
const audioProcessor = require('../src/renderer/audio-processor.js');

function runTests() {
    console.log("Running Audio Processor Tests...");

    try {
        // Test Case 1: Default dot (120) and dashRatio (2.2) -> threshold 264
        console.log("- Test: classifyTone with default dot");
        const state1 = { toneDurations: [] };
        assert.strictEqual(audioProcessor.classifyTone(state1, 100), ".", "100ms should be a dot (threshold 264)");
        assert.strictEqual(audioProcessor.classifyTone(state1, 250), ".", "250ms should be a dot (threshold 264)");
        assert.strictEqual(audioProcessor.classifyTone(state1, 280), "-", "280ms should be a dash (threshold 264)");
        assert.strictEqual(audioProcessor.classifyTone(state1, 400), "-", "400ms should be a dash (threshold 264)");

        // Test Case 2: Custom dot from durations (e.g., 100) -> threshold 220
        console.log("- Test: classifyTone with custom durations");
        const state2 = { toneDurations: [100, 300] };
        assert.strictEqual(audioProcessor.classifyTone(state2, 210), ".", "210ms should be a dot with dot=100 (threshold 220)");
        assert.strictEqual(audioProcessor.classifyTone(state2, 230), "-", "230ms should be a dash with dot=100 (threshold 220)");

        // Test Case 3: Durations below minDot (60) -> threshold 132
        console.log("- Test: classifyTone with durations below minDot");
        const state3 = { toneDurations: [40, 50] };
        assert.strictEqual(audioProcessor.classifyTone(state3, 120), ".", "120ms should be a dot with dot=60 (minDot) (threshold 132)");
        assert.strictEqual(audioProcessor.classifyTone(state3, 140), "-", "140ms should be a dash with dot=60 (minDot) (threshold 132)");

        console.log("\nAll Audio Processor tests passed!");
    } catch (error) {
        console.error("\nTests FAILED!");
        console.error(error);
        process.exit(1);
    }
}

runTests();
