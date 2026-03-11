var UI = require('./ui-controller.js');
var AudioProcessor = require('./audio-processor.js');
var SpectrumVisualizer = require('./spectrum-visualizer.js');
var RadioService = require('../services/radio-service.js');
var AIService = require('../services/ai-service.js');
var DecoderService = require('../services/decoder-service.js');
var CollectionService = require('../services/collection-service.js');
var SDRBridgeService = require('../services/sdr-bridge-service.js');

document.addEventListener('DOMContentLoaded', () => {
    console.log("App Initializing...");
    UI.init();

    setupRadioSubscriptions();
    setupDecoderAndCollection();
    setupAudioAndVisualizer();
    setupUIControls();
    setupAIChat();
    setupSettings();
});

function setupRadioSubscriptions() {
    // Initialize Radio State Display
    const initialState = RadioService.getState();
    UI.updateFrequency(initialState.frequency);
    UI.updateMode(initialState.mode);

    // Subscribe to SDR Bridge Status
    SDRBridgeService.on('status', (status) => {
        UI.updateSdrStatus(status);
    });

    // Subscribe to Radio State Changes to keep UI in sync
    RadioService.subscribe((state) => {
        UI.updateFrequency(state.frequency);
        UI.updateMode(state.mode);
        UI.updateSignal(state.rssi, state.isSignalPresent);

        // Sync Decoder Frequency
        DecoderService.setFrequency(state.frequency);

        // Update Scan Button
        if (UI.elements.scanButton) {
            UI.elements.scanButton.textContent = state.isScanning ? "Stop Scan" : "SCAN";
            UI.elements.scanButton.classList.toggle('active', state.isScanning);
            if (state.isScanning) {
                UI.setStatus("Scanning...");
            } else if (state.isSignalPresent) {
                UI.setStatus("Signal Locked");
            } else {
                UI.setStatus("Ready");
            }
        }
    });
}

function setupDecoderAndCollection() {
    // Listen to Decoder Service for Simulated or Real Traffic
    DecoderService.on('decoded', async (data) => {
        // Raw Output
        const time = new Date(data.timestamp).toLocaleTimeString();
        const line = `[${time}] ${data.text}`;
        UI.appendDecoderLog(line);

        // Auto-Monitor Logic
        if (UI.elements.autoMonitorToggle && UI.elements.autoMonitorToggle.checked) {
            UI.setStatus("AI Analyzing...");
            try {
                const analysis = await AIService.analyzeTraffic(data.text);
                UI.addTacticalLog(analysis);
                UI.setStatus("Monitoring Active");
            } catch (e) {
                console.error("Auto-Monitor Error", e);
            }
        }
    });

    // --- Collection Service Integration ---
    if (UI.elements.autoCollectToggle) {
        UI.elements.autoCollectToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                // Disable Auto-Mon to prevent double processing
                if (UI.elements.autoMonitorToggle) {
                    UI.elements.autoMonitorToggle.checked = false;
                    UI.elements.autoMonitorToggle.disabled = true;
                }

                CollectionService.start();
                if (UI.elements.scanButton) UI.elements.scanButton.disabled = true;
            } else {
                if (UI.elements.autoMonitorToggle) {
                    UI.elements.autoMonitorToggle.disabled = false;
                }

                CollectionService.stop();
                if (UI.elements.scanButton) UI.elements.scanButton.disabled = false;
            }
        });
    }

    CollectionService.on('status', (msg) => {
        UI.setStatus(msg);
    });

    CollectionService.on('collection-hit', (data) => {
        // Log to Tactical Log
        UI.addTacticalLog(data.analysis);
    });
}

function setupAudioAndVisualizer() {
    // Initialize Spectrum Visualizer
    if (UI.elements.spectrum) {
        const visualizer = new SpectrumVisualizer(UI.elements.spectrum);
        visualizer.start();

        // Wire Audio to Visualizer
        AudioProcessor.on('analyser', (analyser) => {
            visualizer.setAnalyser(analyser);
        });
    }

    // Wire Audio Events to UI
    AudioProcessor.on('status', (msg) => UI.setStatus(msg));
    AudioProcessor.on('text', (text) => {
        UI.updateDecoderBuffer(text);
    });

    AudioProcessor.on('morse', (morse) => {
        // Optional: show morse dots/dashes somewhere
    });
}

function setupUIControls() {
    // Scan Button
    if (UI.elements.scanButton) {
        UI.elements.scanButton.addEventListener('click', () => {
            if (RadioService.getState().isScanning) {
                RadioService.stopScan();
            } else {
                RadioService.startScan();
            }
        });
    }

    // UI Control Events
    if (UI.elements.micToggle) {
        UI.elements.micToggle.addEventListener('click', () => {
            if (AudioProcessor.micStream) {
                AudioProcessor.stopMic();
                UI.elements.micToggle.textContent = 'Start Mic';
                UI.elements.micToggle.classList.remove('active');
            } else {
                AudioProcessor.startMic(false); // Default to Mic
                UI.elements.micToggle.textContent = 'Stop Mic';
                UI.elements.micToggle.classList.add('active');
            }
        });
    }

    // Source Selection (Mic vs System)
    if (UI.elements.sourceSelect) {
        UI.elements.sourceSelect.addEventListener('change', (e) => {
            if (AudioProcessor.micStream) {
                AudioProcessor.stopMic();
                UI.elements.micToggle.textContent = 'Start Mic';
                UI.elements.micToggle.classList.remove('active');
            }
            // User must click start again to activate new source
        });
    }

    // Recording Logic
    let isRecording = false;
    if (UI.elements.recordButton) {
        UI.elements.recordButton.addEventListener('click', () => {
            if (!AudioProcessor.micStream) {
                UI.setStatus("Start audio first!");
                return;
            }
            if (isRecording) {
                AudioProcessor.stopRecording();
                UI.elements.recordButton.textContent = '● Rec';
                UI.elements.recordButton.classList.remove('active');
                isRecording = false;
            } else {
                AudioProcessor.startRecording();
                UI.elements.recordButton.textContent = '■ Stop';
                UI.elements.recordButton.classList.add('active');
                isRecording = true;
            }
        });
    }

    AudioProcessor.on('recording-complete', (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `recording-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
        UI.setStatus("Recording saved to Downloads");
    });

    // Decoder Selection
    if (UI.elements.decoderSelect) {
        UI.elements.decoderSelect.addEventListener('change', (e) => {
            const decoder = e.target.value;
            DecoderService.setActiveDecoder(decoder);
            UI.setStatus(`Decoder set to ${decoder.toUpperCase()}`);
            const badge = document.querySelector('.badge');
            if (badge) badge.textContent = decoder.toUpperCase();
        });
    }

    // Radio Controls
    if (UI.elements.freqInput) {
        UI.elements.freqInput.addEventListener('change', (e) => {
            RadioService.setFrequency(Number(e.target.value));
        });
    }
    if (UI.elements.modeSelect) {
        UI.elements.modeSelect.addEventListener('change', (e) => {
            RadioService.setMode(e.target.value);
        });
    }
}

function setupAIChat() {
    // AI Chat
    if (UI.elements.sendButton) {
        UI.elements.sendButton.addEventListener('click', handleChatSend);
    }
    if (UI.elements.chatInput) {
        UI.elements.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleChatSend();
        });
    }

function buildSystemPrompt() {
        const radioState = RadioService.getState();
        const context = {
            radio: radioState,
            decoder: DecoderService.getActiveDecoder() ? DecoderService.getActiveDecoder().name : 'None',
            recentDecodedText: UI.elements.decoderOutput.textContent.slice(-200) // Last 200 chars
        };

        return `You are a semi-chatbot Radio Worker and RFML (Radio Frequency Machine Learning) expert.
        Current Radio State: Freq=${radioState.frequency}Hz, Mode=${radioState.mode}.
        Active Decoder: ${context.decoder}.
        Recent Decoded Text: "${context.recentDecodedText}".

        Act as a helpful, conversational radio operator.
        If the user asks you to tune the radio or change the frequency, you can do so by including <TUNE:123456> in your response (where 123456 is the frequency in Hz).
        If the user asks you to change the mode, include <MODE:USB> (or FM, AM, LSB, CW) in your response.
        Answer naturally and provide insights on RF signatures, signal intelligence, and radio operations.`;
    }

    function processAICommands(response) {
        let responseText = response;
        try {
            const tuneMatch = response.match(/<TUNE:(\d+)>/i);
            if (tuneMatch) {
                const freq = parseInt(tuneMatch[1], 10);
                RadioService.setFrequency(freq);
                UI.updateFrequency(freq);
                responseText += `\n[System: Tuned to ${freq} Hz]`;
            }
            const modeMatch = response.match(/<MODE:([A-Z]+)>/i);
            if (modeMatch) {
                const mode = modeMatch[1].toUpperCase();
                RadioService.setMode(mode);
                UI.updateMode(mode);
                responseText += `\n[System: Mode set to ${mode}]`;
            }
            // Strip the tags from the final chat display to make it natural
            responseText = responseText.replace(/<TUNE:\d+>/gi, '').replace(/<MODE:[A-Z]+>/gi, '').trim();
        } catch (e) {
            console.error("Failed to parse AI command", e);
        }
        return responseText;
    }

    async function handleChatSend() {
        const input = UI.getChatInput();
        if (!input.trim()) return;

        UI.appendChatMessage('User', input);
        UI.clearChatInput();

        const systemPrompt = buildSystemPrompt();

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: input }
        ];

        try {
            UI.setStatus("AI Thinking...");
            const response = await AIService.sendPrompt(messages);
            UI.setStatus("AI Ready");

            const responseText = processAICommands(response);

            UI.appendChatMessage('Assistant', responseText);
        } catch (err) {
            UI.setStatus("AI Error");
            UI.appendChatMessage('System', `Error: ${err.message}`);
        }
    }
}

function setupSettings() {
    // Settings Panel
    if (UI.elements.settingsButton) {
        UI.elements.settingsButton.addEventListener('click', () => UI.toggleSettings());
    }

    if (UI.elements.saveSettingsButton) {
        UI.elements.saveSettingsButton.addEventListener('click', () => {
            const settings = UI.getSettings();
            AIService.configure(settings);
            UI.toggleSettings();
            UI.setStatus("Settings saved");
        });
    }
}
