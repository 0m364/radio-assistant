const assert = require('node:assert');
const { encodeToMorse } = require('../src/common/morse.js');

function runTests() {
    console.log("Running Morse Encoder Tests...");

    try {
        // Test Case 1: Basic encoding
        console.log("- Test: Basic encoding (SOS)");
        assert.strictEqual(encodeToMorse("SOS"), "... --- ...");

        // Test Case 2: Case insensitivity
        console.log("- Test: Case insensitivity (sos)");
        assert.strictEqual(encodeToMorse("sos"), "... --- ...");

        // Test Case 3: Numbers and punctuation
        console.log("- Test: Numbers and punctuation");
        assert.strictEqual(encodeToMorse("123!"), ".---- ..--- ...-- -.-.--");

        // Test Case 4: Word separation
        console.log("- Test: Word separation (HI THERE)");
        assert.strictEqual(encodeToMorse("HI THERE"), ".... .. / - .... . .-. .");

        // Test Case 5: Multiple spaces between words
        console.log("- Test: Multiple spaces between words (HI  THERE)");
        const multiSpace = encodeToMorse("HI  THERE");
        assert.strictEqual(multiSpace, ".... .. / / - .... . .-. .", "Should preserve word gaps");

        // Test Case 6: Unknown characters
        console.log("- Test: Unknown characters ($#)");
        assert.strictEqual(encodeToMorse("$#"), "$ #");

        // Test Case 7: Empty/Null/Undefined input
        console.log("- Test: Empty/Null/Undefined input");
        assert.strictEqual(encodeToMorse(""), "");
        assert.strictEqual(encodeToMorse(null), "");
        assert.strictEqual(encodeToMorse(undefined), "");

        // Test Case 8: Leading and trailing spaces
        console.log("- Test: Leading and trailing spaces");
        // Due to the current implementation, leading spaces become '/ / '
        assert.strictEqual(encodeToMorse("  SOS  "), "/ / ... --- ... / /");

        // Test Case 9: Mixed known and unknown
        console.log("- Test: Mixed characters");
        assert.strictEqual(encodeToMorse("A B$"), ".- / -... $");

        console.log("\nAll Morse Encoder tests passed!");
    } catch (error) {
        console.error("\nTests FAILED!");
        console.error(error);
        process.exit(1);
    }
}

runTests();
