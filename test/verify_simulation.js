const RadioService = require('../src/services/radio-service.js');
const DecoderService = require('../src/services/decoder-service.js');
const AIService = require('../src/services/ai-service.js');

// Mock AI Service to avoid network calls
AIService.analyzeTraffic = async (text) => {
    console.log(`[AI Mock] Analyzing: "${text}"`);
    return {
        type: 'Simulation',
        priority: 'Medium',
        summary: 'Mocked Analysis',
        entities: ['MockEntity']
    };
};

// Wire up services
RadioService.subscribe((state) => {
    // Sync Decoder frequency
    DecoderService.setFrequency(state.frequency);
});

DecoderService.on('decoded', async (data) => {
    console.log(`\n[Decoder] DECODED: "${data.text}" (Type: ${data.type})`);

    // Test AI Integration
    const analysis = await AIService.analyzeTraffic(data.text);
    console.log(`[AI Analysis] Type: ${analysis.type}, Priority: ${analysis.priority}`);

    // Stop after one successful decode to finish test
    console.log("Test Passed!");
    process.exit(0);
});

console.log("Starting Radio Scan...");
RadioService.startScan();

// Timeout if nothing happens
setTimeout(() => {
    console.error("Test Timed Out - No signals found");
    process.exit(1);
}, 20000);
