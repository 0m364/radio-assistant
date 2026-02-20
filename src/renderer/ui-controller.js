class UIController {
    constructor() {
        this.elements = {};
    }

    init() {
        this.elements = {
            status: document.getElementById('status-bar'),
            spectrum: document.getElementById('spectrum-canvas'),
            decoderOutput: document.getElementById('decoder-output'),
            chatOutput: document.getElementById('chat-output'),
            chatInput: document.getElementById('chat-input'),
            sendButton: document.getElementById('send-button'),
            freqInput: document.getElementById('freq-input'),
            modeSelect: document.getElementById('mode-select'),
            micToggle: document.getElementById('mic-toggle'),
            recordButton: document.getElementById('record-button'),
            sourceSelect: document.getElementById('audio-source-select'),
            decoderSelect: document.getElementById('decoder-select'),
            settingsButton: document.getElementById('settings-button'),
            settingsPanel: document.getElementById('settings-panel'),
            saveSettingsButton: document.getElementById('save-settings'),
            apiKeyInput: document.getElementById('api-key'),
            apiBaseInput: document.getElementById('api-base'),
            apiModelInput: document.getElementById('api-model')
        };
    }

    setStatus(text) {
        if (this.elements.status) this.elements.status.textContent = text;
    }

    updateDecoderOutput(text) {
        // For Morse, we replace the content or append?
        // Let's keep it simple: replace content of a "current" line, or just set textContent.
        // If we want a scrolling log, we should handle that.
        if (this.elements.decoderOutput) {
            this.elements.decoderOutput.textContent = text;
        }
    }

    appendChatMessage(role, text) {
        if (!this.elements.chatOutput) return;
        const msg = document.createElement('div');
        msg.className = `chat-message ${role}`;

        const roleSpan = document.createElement('span');
        roleSpan.className = 'role';
        roleSpan.textContent = `${role}:`;

        const contentSpan = document.createElement('span');
        contentSpan.className = 'content';
        contentSpan.textContent = text;

        msg.appendChild(roleSpan);
        msg.appendChild(document.createTextNode(' ')); // Space
        msg.appendChild(contentSpan);

        this.elements.chatOutput.appendChild(msg);
        this.elements.chatOutput.scrollTop = this.elements.chatOutput.scrollHeight;
    }

    getChatInput() {
        return this.elements.chatInput ? this.elements.chatInput.value : '';
    }

    clearChatInput() {
        if (this.elements.chatInput) this.elements.chatInput.value = '';
    }

    updateFrequency(freq) {
        if (this.elements.freqInput) this.elements.freqInput.value = freq;
    }

    updateMode(mode) {
        if (this.elements.modeSelect) this.elements.modeSelect.value = mode;
    }

    toggleSettings() {
        if (this.elements.settingsPanel) {
            this.elements.settingsPanel.classList.toggle('hidden');
        }
    }

    getSettings() {
        return {
            apiKey: this.elements.apiKeyInput.value,
            baseUrl: this.elements.apiBaseInput.value,
            model: this.elements.apiModelInput.value
        };
    }
}

module.exports = new UIController();
