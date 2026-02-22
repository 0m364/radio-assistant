class UIController {
    constructor() {
        this.elements = {};
        this.mapInterval = null;
    }

    init() {
        const ids = [
            'status-bar', 'spectrum-canvas', 'decoder-output', 'chat-output', 'chat-input',
            'send-button', 'freq-input', 'mode-select', 'mic-toggle', 'record-button',
            'audio-source-select', 'decoder-select', 'settings-button', 'settings-panel',
            'save-settings', 'api-key', 'api-base', 'api-model',
            'scan-button', 'auto-monitor-toggle', 'auto-collect-toggle', 'rssi-bar', 'rssi-value',
            'tactical-log', 'alert-badge', 'system-status', 'geo-coords',
            'map-canvas', 'threat-level' // New IDs
        ];

        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                // Convert kebab-case to camelCase for key
                const key = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                this.elements[key] = el;
            }
        });

        this.elements.settingsPanel = document.getElementById('settings-panel');
        this.startMapSimulation();
    }

    startMapSimulation() {
        if (!this.elements.mapCanvas) return;
        const ctx = this.elements.mapCanvas.getContext('2d');
        const updateCanvasSize = () => {
            if (this.elements.mapCanvas.parentElement) {
                this.elements.mapCanvas.width = this.elements.mapCanvas.parentElement.clientWidth;
                this.elements.mapCanvas.height = this.elements.mapCanvas.parentElement.clientHeight;
            }
        };
        window.addEventListener('resize', updateCanvasSize);
        updateCanvasSize();

        const draw = () => {
            const w = this.elements.mapCanvas.width;
            const h = this.elements.mapCanvas.height;

            // Dark background
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, w, h);

            // Grid
            ctx.strokeStyle = '#003300';
            ctx.lineWidth = 1;
            for(let x=0; x<w; x+=20) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
            for(let y=0; y<h; y+=20) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }

            // Random Targets
            if (Math.random() > 0.9) {
                const x = Math.random() * w;
                const y = Math.random() * h;
                ctx.fillStyle = '#0f0';
                ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI*2); ctx.fill();

                // Fade effect
                ctx.strokeStyle = '#0f0';
                ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI*2); ctx.stroke();
            }
        };

        this.mapInterval = setInterval(draw, 1000);
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
        contentSpan.textContent = text;

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
        if (this.elements.freqInput && document.activeElement !== this.elements.freqInput) {
            this.elements.freqInput.value = freq;
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
        div.className = `log-entry ${entry.urgency ? entry.urgency.toLowerCase() : 'routine'}`;

        const time = new Date().toLocaleTimeString('en-US', { hour12: false });

        // 1. Timestamp
        const tsSpan = document.createElement('span');
        tsSpan.className = 'timestamp';
        tsSpan.textContent = `[${time}]`;
        div.appendChild(tsSpan);

        // 2. Encryption Badge
        if (entry.cipher_status === 'ENCRYPTED' || entry.cipher_status === 'CODED') {
            const badge = document.createElement('span');
            badge.className = 'badge alert';
            badge.textContent = `🔒 ${entry.cipher_status}`;
            div.appendChild(document.createTextNode(' '));
            div.appendChild(badge);
        }

        // 3. Urgency Badge
        if (entry.urgency === 'FLASH' || entry.urgency === 'IMMEDIATE') {
            const badge = document.createElement('span');
            badge.className = 'badge alert blink';
            badge.textContent = entry.urgency;
            div.appendChild(document.createTextNode(' '));
            div.appendChild(badge);
        }

        // 4. Type
        const typeSpan = document.createElement('span');
        typeSpan.className = 'type';
        typeSpan.textContent = ` [${entry.type || 'UNK'}] `;
        div.appendChild(typeSpan);

        // 5. Callsigns
        if (entry.callsign_source && entry.callsign_source !== 'UNKNOWN') {
             const sourceSpan = document.createElement('span');
             sourceSpan.className = 'callsign';
             sourceSpan.textContent = entry.callsign_source;
             div.appendChild(sourceSpan);

             if (entry.callsign_dest && entry.callsign_dest !== 'UNKNOWN') {
                 div.appendChild(document.createTextNode(' -> '));
                 const destSpan = document.createElement('span');
                 destSpan.className = 'callsign';
                 destSpan.textContent = entry.callsign_dest;
                 div.appendChild(destSpan);
             }
             div.appendChild(document.createTextNode(': '));
        }

        // 6. Summary
        const sumSpan = document.createElement('span');
        sumSpan.className = 'summary';
        sumSpan.textContent = entry.summary;
        div.appendChild(sumSpan);

        // 7. Keywords
        if (entry.keywords && entry.keywords.length > 0) {
            const kwDiv = document.createElement('div');
            kwDiv.className = 'keywords';
            kwDiv.textContent = `KEYS: ${entry.keywords.join(', ')}`;
            div.appendChild(kwDiv);
        }

        this.elements.tacticalLog.prepend(div);
        this.updateThreatDisplay(entry);
    }

    updateThreatDisplay(entry) {
        // Threat Level Logic
        let threat = "DEFCON 5";
        let color = "#0f0"; // Green

        if (entry.urgency === 'FLASH') {
            threat = "DEFCON 1";
            color = "#f00";
        } else if (entry.urgency === 'IMMEDIATE') {
            threat = "DEFCON 2";
            color = "#ff4400";
        } else if (entry.cipher_status === 'ENCRYPTED') {
            threat = "DEFCON 3";
            color = "#ffaa00";
        }

        if (this.elements.threatLevel) {
            this.elements.threatLevel.textContent = threat;
            this.elements.threatLevel.style.color = color;
            if (threat === "DEFCON 1") {
                this.elements.threatLevel.classList.add('blink');
            } else {
                this.elements.threatLevel.classList.remove('blink');
            }
        }

        if (this.elements.alertBadge) {
             if (entry.urgency === 'FLASH' || entry.urgency === 'IMMEDIATE') {
                 this.elements.alertBadge.textContent = "ALERT";
                 this.elements.alertBadge.classList.add('active');
             } else {
                 this.elements.alertBadge.textContent = entry.type || "--";
                 this.elements.alertBadge.classList.remove('active');
             }
        }
    }
}

module.exports = new UIController();
