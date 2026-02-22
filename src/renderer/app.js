const UI = require('./ui-controller.js');
const AudioProcessor = require('./audio-processor.js');
const SpectrumVisualizer = require('./spectrum-visualizer.js');
const RadioService = require('../services/radio-service.js');
const AIService = require('../services/ai-service.js');
const DecoderService = require('../services/decoder-service.js');
const CollectionService = require('../services/collection-service.js');

document.addEventListener('DOMContentLoaded', () => {
    console.log("App Initializing...");
    UI.init();

    // Initialize Radio State Display
    const initialState = RadioService.getState();
    UI.updateFrequency(initialState.frequency);
    UI.updateMode(initialState.mode);

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
    // --------------------------------------

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
            const source = e.target.value;
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

    // AI Chat
    if (UI.elements.sendButton) {
        UI.elements.sendButton.addEventListener('click', handleChatSend);
    }
    if (UI.elements.chatInput) {
        UI.elements.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleChatSend();
        });
    }

    async function handleChatSend() {
        const input = UI.getChatInput();
        if (!input.trim()) return;

        UI.appendChatMessage('User', input);
        UI.clearChatInput();

        // Build context
        const radioState = RadioService.getState();
        const context = {
            radio: radioState,
            decoder: DecoderService.getActiveDecoder() ? DecoderService.getActiveDecoder().name : 'None',
            recentDecodedText: UI.elements.decoderOutput.textContent.slice(-200) // Last 200 chars
        };

        const systemPrompt = `You are an AI Radio Assistant.
        Current Radio State: Freq=${radioState.frequency}Hz, Mode=${radioState.mode}.
        Active Decoder: ${context.decoder}.
        Recent Decoded Text: "${context.recentDecodedText}".

        If the user asks to tune to a frequency, reply with a JSON block: {"action": "TUNE", "frequency": 123456}.
        If the user asks to change mode, reply with: {"action": "MODE", "mode": "FM"}.
        Otherwise, answer normally.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: input }
        ];

        try {
            UI.setStatus("AI Thinking...");
            const response = await AIService.sendPrompt(messages);
            UI.setStatus("AI Ready");

            // Check for JSON commands
            let responseText = response;
            try {
                // simple heuristic to find json block
                const jsonMatch = response.match(/\{.*"action":.*\}/s);
                if (jsonMatch) {
                    const command = JSON.parse(jsonMatch[0]);
                    if (command.action === 'TUNE') {
                        RadioService.setFrequency(command.frequency);
                        UI.updateFrequency(command.frequency);
                        responseText += `\n[System: Tuned to ${command.frequency} Hz]`;
                    } else if (command.action === 'MODE') {
                        RadioService.setMode(command.mode);
                        UI.updateMode(command.mode);
                        responseText += `\n[System: Mode set to ${command.mode}]`;
                    }
                }
            } catch (e) {
                console.error("Failed to parse AI command", e);
            }

            UI.appendChatMessage('Assistant', responseText);
        } catch (err) {
            UI.setStatus("AI Error");
            UI.appendChatMessage('System', `Error: ${err.message}`);
        }
    }

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
});
