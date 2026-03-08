const EventEmitter = require('events');
const WebSocket = require('ws');
const net = require('net');
const RadioService = require('./radio-service.js');

class SDRBridgeService extends EventEmitter {
    constructor() {
        super();
        this.wss = null;
        this.clients = new Set();

        // RigCtl / Hamlib TCP Client
        this.tcpClient = null;
        this.tcpReconnectInterval = null;
        this.lastPolledFreq = 0;
        this.lastPolledMode = '';
        this.pollInterval = null;
        this.tcpBuffer = '';

        this.status = {
            wsActive: false,
            tcpActive: false,
            activeClientType: 'none' // 'websdr', 'local-sdr', or 'none'
        };

        // Suppress circular updates: true when we just sent a command to the SDR
        this.ignoreNextPoll = false;

        // Listen to local RadioService changes to broadcast to SDRs
        RadioService.subscribe((state) => {
            if (this.status.activeClientType === 'websdr') {
                this.broadcastWs({
                    type: 'tune',
                    frequency: state.frequency,
                    mode: state.mode
                });
            } else if (this.status.activeClientType === 'local-sdr' && this.status.tcpActive) {
                // If the app changes frequency, tell the SDR
                // But don't do it if the change was initiated by polling the SDR!
                if (state.frequency !== this.lastPolledFreq) {
                    this.sendTcpCommand(`F ${state.frequency}`);
                    this.ignoreNextPoll = true;
                    this.lastPolledFreq = state.frequency;
                }
                if (state.mode !== this.lastPolledMode) {
                    // Translate modes roughly
                    let sdrMode = state.mode;
                    if (sdrMode === 'FM') sdrMode = 'WFM'; // Adjust as needed
                    // this.sendTcpCommand(`M ${sdrMode} -1`); // RigCtl mode command
                    this.lastPolledMode = state.mode;
                }
            }
        });

        this.initWebSocketServer();
        this.initTcpClient();
    }

    updateStatus(updates) {
        this.status = { ...this.status, ...updates };

        // Update activeClientType based on connection states
        if (this.clients.size > 0) {
            this.status.activeClientType = 'websdr';
        } else if (this.status.tcpActive) {
            this.status.activeClientType = 'local-sdr';
        } else {
            this.status.activeClientType = 'none';
        }

        this.emit('status', this.status);
    }

    // --- WebSocket Server (WebSDR Extension) ---

    initWebSocketServer() {
        try {
            this.wss = new WebSocket.Server({ port: 3456 });

            this.wss.on('listening', () => {
                console.log('SDR Bridge: WebSocket Server listening on port 3456');
                this.updateStatus({ wsActive: true });
            });

            this.wss.on('connection', (ws) => {
                console.log('SDR Bridge: WebSDR extension connected');
                this.clients.add(ws);
                this.updateStatus({ activeClientType: 'websdr' });

                // Send current state to new client
                const currentState = RadioService.getState();
                ws.send(JSON.stringify({
                    type: 'tune',
                    frequency: currentState.frequency,
                    mode: currentState.mode
                }));

                ws.on('message', (message) => {
                    try {
                        const data = JSON.parse(message);
                        this.handleWsMessage(data);
                    } catch (e) {
                        console.error('SDR Bridge: Invalid WS message', e);
                    }
                });

                ws.on('close', () => {
                    console.log('SDR Bridge: WebSDR extension disconnected');
                    this.clients.delete(ws);
                    this.updateStatus(); // Recalculate activeClientType
                });
            });

            this.wss.on('error', (err) => {
                console.error('SDR Bridge: WebSocket Server Error:', err);
                this.updateStatus({ wsActive: false });
            });
        } catch (e) {
            console.error('SDR Bridge: Failed to initialize WebSocket Server', e);
        }
    }

    handleWsMessage(data) {
        // Basic type and null check
        if (!data || typeof data !== 'object' || Array.isArray(data)) return;

        if (data.type === 'sdr_state') {
            const currentState = RadioService.getState();

            // Validate frequency: must be a positive number
            if (typeof data.frequency === 'number' && data.frequency > 0 && Number.isFinite(data.frequency)) {
                if (data.frequency !== currentState.frequency) {
                    RadioService.setFrequency(data.frequency);
                }
            } else if (data.frequency !== undefined) {
                console.warn('SDR Bridge: Invalid frequency received via WS', data.frequency);
            }

            // Validate mode: must be a non-empty string
            if (typeof data.mode === 'string' && data.mode.length > 0) {
                if (data.mode !== currentState.mode) {
                    RadioService.setMode(data.mode);
                }
            } else if (data.mode !== undefined) {
                console.warn('SDR Bridge: Invalid mode received via WS', data.mode);
            }
        }
    }

    broadcastWs(message) {
        if (this.clients.size === 0) return;
        const payload = JSON.stringify(message);
        for (const client of this.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
            }
        }
    }

    // --- TCP Client (Hamlib / RigCtl for Local SDRs) ---

    initTcpClient() {
        this.connectTcp();

        // Auto-reconnect loop
        this.tcpReconnectInterval = setInterval(() => {
            if (!this.status.tcpActive) {
                this.connectTcp();
            }
        }, 5000); // Try every 5 seconds
    }

    connectTcp() {
        if (this.tcpClient) {
            this.tcpClient.destroy();
        }

        this.tcpClient = new net.Socket();

        this.tcpClient.on('connect', () => {
            console.log('SDR Bridge: Connected to Local SDR via RigCtl (Port 4532)');
            this.updateStatus({ tcpActive: true });

            // Start polling SDR for frequency changes
            if (this.pollInterval) clearInterval(this.pollInterval);
            this.pollInterval = setInterval(() => {
                this.pollSdr();
            }, 500); // Poll twice a second
        });

        this.tcpClient.on('data', (data) => {
            this.tcpBuffer += data.toString();

            // Process lines (RigCtl responses are usually newline terminated)
            let n = this.tcpBuffer.indexOf('\n');
            while (n !== -1) {
                let line = this.tcpBuffer.substring(0, n).trim();
                this.tcpBuffer = this.tcpBuffer.substring(n + 1);
                this.handleTcpResponse(line);
                n = this.tcpBuffer.indexOf('\n');
            }
        });

        this.tcpClient.on('error', (err) => {
            // Suppress connection refused errors in console to avoid spam
            if (err.code !== 'ECONNREFUSED') {
                console.error('SDR Bridge TCP Error:', err.message);
            }
        });

        this.tcpClient.on('close', () => {
            if (this.status.tcpActive) {
                console.log('SDR Bridge: Disconnected from Local SDR');
                this.updateStatus({ tcpActive: false });
                if (this.pollInterval) clearInterval(this.pollInterval);
            }
        });

        // SDR++, Gqrx, SDR# usually expose RigCtl on port 4532
        this.tcpClient.connect(4532, '127.0.0.1');
    }

    sendTcpCommand(cmd) {
        if (this.status.tcpActive && this.tcpClient && !this.tcpClient.destroyed) {
            this.tcpClient.write(cmd + '\n');
        }
    }

    pollSdr() {
        if (!this.status.tcpActive || this.ignoreNextPoll) {
            this.ignoreNextPoll = false;
            return;
        }

        // 'f' commands Hamlib to return the current frequency
        this.sendTcpCommand('f');
        // 'm' commands Hamlib to return the current mode (optional, disabled to keep simple)
        // this.sendTcpCommand('m');
    }

    handleTcpResponse(line) {
        // Hamlib 'f' response is just the frequency in Hz on a single line
        // E.g., "11175000"

        if (line.match(/^\d+$/)) {
            const freq = parseInt(line, 10);

            if (freq > 0 && freq !== this.lastPolledFreq) {
                this.lastPolledFreq = freq;

                // Only update RadioService if the SDR frequency differs
                const appFreq = RadioService.getState().frequency;
                if (freq !== appFreq) {
                    // Update RadioService (this will trigger the subscribe callback,
                    // but we won't loop back because state.frequency === this.lastPolledFreq)
                    RadioService.setFrequency(freq);
                }
            }
        }
    }
}

module.exports = new SDRBridgeService();
