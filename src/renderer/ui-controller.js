class UIController {
    constructor() {
        this.elements = {};
    }

    init() {
        const ids = [
            'status-bar', 'spectrum-canvas', 'decoder-output', 'chat-output', 'chat-input',
            'send-button', 'freq-input', 'mode-select', 'mic-toggle', 'record-button',
            'audio-source-select', 'decoder-select', 'settings-button', 'settings-panel',
            'save-settings', 'api-key', 'api-base', 'api-model',
            'scan-button', 'auto-monitor-toggle', 'rssi-bar', 'rssi-value',
            'tactical-log', 'alert-badge', 'system-status', 'geo-coords'
        ];

        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                // Convert kebab-case to camelCase for key
                const key = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                this.elements[key] = el;
            }
        });

        // specific mappings if needed (none really needed if naming convention holds)
        this.elements.settingsPanel = document.getElementById('settings-panel');
        this.elements.micToggle = document.getElementById('mic-toggle'); // ensure this exists
    }

    setStatus(text) {
        if (this.elements.statusBar) this.elements.statusBar.textContent = text;
    }

    updateDecoderBuffer(text) {
        if (this.elements.decoderOutput) {
            let last = this.elements.decoderOutput.lastElementChild;
            if (!last || !last.classList.contains('live-buffer')) {
                last = document.createElement('div');
                last.className = 'live-buffer';
                this.elements.decoderOutput.appendChild(last);
            }
            last.textContent = `> ${text}`;
            this.elements.decoderOutput.scrollTop = this.elements.decoderOutput.scrollHeight;
        }
    }

    appendDecoderLog(text) {
        if (this.elements.decoderOutput) {
            const line = document.createElement('div');
            line.className = 'log-entry';
            line.textContent = text;
            this.elements.decoderOutput.appendChild(line);
            this.elements.decoderOutput.scrollTop = this.elements.decoderOutput.scrollHeight;
        }
    }

    appendChatMessage(role, text) {
        if (!this.elements.chatOutput) return;
        const msg = document.createElement('div');
        msg.className = `chat-message ${role.toLowerCase()}`;

        const roleSpan = document.createElement('span');
        roleSpan.className = 'role';
        roleSpan.textContent = `${role}:`;

        const contentSpan = document.createElement('span');
        contentSpan.className = 'content';
        contentSpan.textContent = text; // Secure text content

        msg.appendChild(roleSpan);
        msg.appendChild(document.createTextNode(' '));
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
        if (this.elements.freqInput) {
             // Avoid loop if focused? maybe not needed for now
             if (document.activeElement !== this.elements.freqInput) {
                this.elements.freqInput.value = freq;
             }
        }
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
            apiKey: this.elements.apiKey.value,
            baseUrl: this.elements.apiBase.value,
            model: this.elements.apiModel.value
        };
    }

    updateSignal(rssi, present) {
        if (this.elements.rssiBar && this.elements.rssiValue) {
            const min = -120;
            const max = -40;
            let percent = ((rssi - min) / (max - min)) * 100;
            percent = Math.max(0, Math.min(100, percent));

            this.elements.rssiBar.style.width = `${percent}%`;
            this.elements.rssiValue.textContent = `${rssi.toFixed(0)} dBm`;

            if (present) {
                this.elements.rssiBar.style.backgroundColor = '#00ff00';
                this.elements.rssiBar.style.boxShadow = '0 0 10px #00ff00';
            } else {
                this.elements.rssiBar.style.backgroundColor = '#444';
                this.elements.rssiBar.style.boxShadow = 'none';
            }
        }
    }

    addTacticalLog(entry) {
        if (!this.elements.tacticalLog) return;

        const div = document.createElement('div');
        const prio = entry.priority ? entry.priority.toLowerCase() : 'low';
        div.className = `log-entry ${prio}`;

        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        // Use textContent for safety, but innerHTML for structure

        const timeSpan = document.createElement('span');
        timeSpan.className = 'timestamp';
        timeSpan.textContent = `[${time}]`;

        const typeSpan = document.createElement('span');
        typeSpan.className = 'type';
        typeSpan.textContent = ` ${entry.type || 'INFO'}`;

        const textNode = document.createTextNode(`: ${entry.summary}`);

        div.appendChild(timeSpan);
        div.appendChild(typeSpan);
        div.appendChild(textNode);

        this.elements.tacticalLog.prepend(div); // Newest top

        // Update badge
        if (this.elements.alertBadge) {
            if (entry.priority === 'High' || entry.priority === 'CRITICAL') {
                this.elements.alertBadge.textContent = "ALERT";
                this.elements.alertBadge.classList.add('active');
            } else {
                // Keep alert if recent? For now reset on low priority? No, better logic needed.
                // Just leave it active until dismissed? Or simple toggle.
                // Let's just set it to type.
                this.elements.alertBadge.textContent = entry.type || "--";
                this.elements.alertBadge.classList.remove('active');
            }
        }
    }
}

module.exports = new UIController();
