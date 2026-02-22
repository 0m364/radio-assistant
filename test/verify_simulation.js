const RadioService = require('../src/services/radio-service.js');
const DecoderService = require('../src/services/decoder-service.js');
const AIService = require('../src/services/ai-service.js');

// Mock AI Service to avoid network calls
AIService.analyzeTraffic = async (text) => {
    console.log(`[AI Mock] Analyzing: "${text}"`);
    return {
        type: 'Military (HFGCS)',
        urgency: 'FLASH',
        cipher_status: 'ENCRYPTED',
        callsign_source: 'SKYKING',
        callsign_dest: 'ALL STATIONS',
        summary: 'Emergency Action Message Intercepted',
        keywords: ['SKYKING', 'EAM']
    };
};

// Wire up services
RadioService.subscribe((state) => {
    // Sync Decoder frequency
    DecoderService.setFrequency(state.frequency);
});

DecoderService.on('decoded', async (data) => {
    console.log(`\n[Decoder] DECODED: "${data.text}" (Freq: ${data.frequency} Hz)`);

    // Test AI Integration
    const analysis = await AIService.analyzeTraffic(data.text);
    console.log(`[AI Analysis] Type: ${analysis.type}, Urgency: ${analysis.urgency}, Status: ${analysis.cipher_status}`);

    // Stop after one successful decode to finish test
    console.log("Test Passed!");
    process.exit(0);
});

// Set start frequency just below target so scan hits it immediately
RadioService.setFrequency(11170000);

console.log("Starting Radio Scan...");
RadioService.startScan();

// Timeout if nothing happens
setTimeout(() => {
    console.error("Test Timed Out - No signals found");
    process.exit(1);
}, 20000);
