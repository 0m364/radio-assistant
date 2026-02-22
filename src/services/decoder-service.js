const EventEmitter = require('events');
const morseDecoder = require('../common/morse.js');
const SIMULATED_TRAFFIC = require('../common/simulated-traffic.js');

class DecoderService extends EventEmitter {
    constructor() {
        super();
        this.decoders = {
            'morse': {
                name: 'Morse Code',
                ...morseDecoder
            },
            'pager': {
                name: 'Pager (POCSAG)',
                decodeFromMorse: (text) => text
            },
            'emergency': {
                name: 'Emergency Alert',
                decodeFromMorse: (text) => text
            }
        };
        this.activeDecoder = 'morse';
        this.simulationInterval = null;
        this.currentFrequency = 0;

        this.startSimulation();
    }

    setActiveDecoder(name) {
        if (this.decoders[name]) {
            this.activeDecoder = name;
        }
    }

    getActiveDecoder() {
        return this.decoders[this.activeDecoder];
    }

    // Called by app when frequency changes
    setFrequency(freq) {
        this.currentFrequency = freq;
    }

    startSimulation() {
        if (this.simulationInterval) clearInterval(this.simulationInterval);

        // Emulate sporadic traffic
        this.simulationInterval = setInterval(() => {
            this.checkAndEmitTraffic();
        }, 4000);
    }

    checkAndEmitTraffic() {
        const match = SIMULATED_TRAFFIC.find(t => Math.abs(t.frequency - this.currentFrequency) < 5000);

        if (match) {
            // 40% chance to emit a message if tuned
            if (Math.random() > 0.6) {
                const message = match.messages[Math.floor(Math.random() * match.messages.length)];

                this.emit('decoded', {
                    text: message,
                    type: match.type, // 'Civilian', 'Emergency', etc.
                    frequency: match.frequency,
                    timestamp: Date.now()
                });
            }
        }
    }
}

module.exports = new DecoderService();
