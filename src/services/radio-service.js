const SIMULATED_TRAFFIC = require('../common/simulated-traffic.js');

class RadioService {
    constructor() {
        this.state = {
            frequency: 144000000, // Hz
            mode: 'FM',
            bandwidth: 12000,
            active: false,
            rssi: -110, // dBm
            snr: 0,     // dB
            isScanning: false,
            isSignalPresent: false
        };
        this.listeners = [];
        this.scanInterval = null;
        this.scanStepSize = 25000; // 25 kHz
        this.scanRange = { min: 118000000, max: 470000000 };
    }

    setFrequency(freq) {
        this.state.frequency = freq;
        this.updateSignalMetrics(); // Updates state and notifies
    }

    setMode(mode) {
        this.state.mode = mode;
        this.notify();
    }

    setBandwidth(bw) {
        this.state.bandwidth = bw;
        this.notify();
    }

    setActive(isActive) {
        this.state.active = isActive;
        this.notify();
    }

    getState() {
        return this.state;
    }

    subscribe(listener) {
        this.listeners.push(listener);
        // Immediately notify current state
        listener(this.state);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(l => l(this.state));
    }

    // --- New Capabilities ---

    calculateSignalMetrics(freq) {
        // Simple simulation: check if freq is close to any simulated traffic
        const match = SIMULATED_TRAFFIC.find(t => Math.abs(t.frequency - freq) < 5000); // 5kHz tolerance
        if (match) {
            // Add some jitter to make it look real
            const jitter = (Math.random() * 4) - 2;
            return {
                rssi: match.rssi + jitter,
                snr: 20 + jitter,
                present: true,
                signalType: match.type
            };
        }
        // Background noise
        const noiseBase = -115;
        const noiseJitter = (Math.random() * 10) - 5;
        return {
            rssi: noiseBase + noiseJitter,
            snr: 0,
            present: false,
            signalType: null
        };
    }

    updateSignalMetrics() {
        const metrics = this.calculateSignalMetrics(this.state.frequency);
        let changed = false;

        // Update frequency-dependent state
        if (this.state.rssi !== metrics.rssi) {
            this.state.rssi = metrics.rssi;
            changed = true;
        }
        if (this.state.snr !== metrics.snr) {
            this.state.snr = metrics.snr;
            changed = true;
        }
        if (this.state.isSignalPresent !== metrics.present) {
            this.state.isSignalPresent = metrics.present;
            changed = true;
        }

        // Always notify on frequency change (called by setFrequency),
        // but if this is called independently (e.g. noise fluctuation), we notify.
        // Since setFrequency calls this, we can just notify at the end.
        this.notify();
    }

    startScan() {
        if (this.state.isScanning) return;
        this.state.isScanning = true;
        this.notify();

        this.scanInterval = setInterval(() => {
            let nextFreq = this.state.frequency + this.scanStepSize;
            if (nextFreq > this.scanRange.max) nextFreq = this.scanRange.min;

            // Update frequency and check for signal
            this.state.frequency = nextFreq;
            this.updateSignalMetrics();

            // Check if signal found
            if (this.state.isSignalPresent) {
                this.stopScan();
                console.log(`Signal found at ${this.state.frequency}`);
            }
        }, 100); // Scan speed (100ms per step)
    }

    stopScan() {
        if (!this.state.isScanning) return;
        this.state.isScanning = false;
        clearInterval(this.scanInterval);
        this.scanInterval = null;
        this.notify();
    }
}

module.exports = new RadioService();
