const assert = require('node:assert');
const AIService = require('../src/services/ai-service.js');

async function runTests() {
    console.log("Running AI Service Tests...");

    const originalSendPrompt = AIService.sendPrompt;

    try {
        // Test Case 1: Valid JSON response
        console.log("- Test: Valid JSON response");
        const mockResponse = {
            type: 'Civilian',
            priority: 'Low',
            summary: 'Normal traffic',
            entities: ['K7ABC']
        };
        AIService.sendPrompt = async () => JSON.stringify(mockResponse);
        let result = await AIService.analyzeTraffic('Some text');
        assert.deepStrictEqual(result, mockResponse, "Should parse valid JSON correctly");

        // Test Case 2: JSON wrapped in markdown
        console.log("- Test: JSON wrapped in markdown");
        AIService.sendPrompt = async () => '```json\n{"type": "Military", "priority": "High", "summary": "Alert", "entities": []}\n```';
        result = await AIService.analyzeTraffic('Some text');
        assert.strictEqual(result.type, 'Military', "Should extract JSON from markdown");
        assert.strictEqual(result.priority, 'High', "Should extract JSON from markdown");

        // Test Case 3: Invalid JSON (fallback to Unknown)
        console.log("- Test: Invalid JSON fallback");
        const invalidText = "This is not JSON at all.";
        AIService.sendPrompt = async () => invalidText;
        result = await AIService.analyzeTraffic('Some text');
        assert.strictEqual(result.type, 'Unknown', "Should return Unknown for invalid JSON");
        assert.ok(result.summary.includes(invalidText.substring(0, 10)), "Summary should contain partial content");
        assert.ok(Array.isArray(result.entities), "Entities should be an array");

        // Test Case 4: sendPrompt throws error (fallback to Error)
        console.log("- Test: sendPrompt error fallback");
        AIService.sendPrompt = async () => { throw new Error('API Down'); };
        result = await AIService.analyzeTraffic('Some text');
        assert.strictEqual(result.type, 'Error', "Should return Error when sendPrompt fails");
        assert.strictEqual(result.summary, 'Analysis Failed', "Summary should indicate failure");

        console.log("\nAll AI Service tests passed!");
    } catch (error) {
        console.error("\nTests FAILED!");
        console.error(error);
        process.exit(1);
    } finally {
        // Restore original method
        AIService.sendPrompt = originalSendPrompt;
    }
}

runTests();
