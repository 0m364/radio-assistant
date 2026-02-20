const morseDecoder = require('../common/morse.js');

class DecoderService {
    constructor() {
        this.decoders = {
            'morse': {
                name: 'Morse Code',
                ...morseDecoder
            },
            'pager': {
                name: 'Pager (POCSAG)',
                decodeFromMorse: (text) => "[Pager Decoder Not Implemented]"
            },
            'emergency': {
                name: 'Emergency Alert',
                decodeFromMorse: (text) => "[Emergency Decoder Not Implemented]"
            }
        };
        this.activeDecoder = 'morse';
    }

    setActiveDecoder(name) {
        if (this.decoders[name]) {
            this.activeDecoder = name;
        }
    }

    getActiveDecoder() {
        return this.decoders[this.activeDecoder];
    }

    getAvailableDecoders() {
        return Object.keys(this.decoders).map(key => ({
            id: key,
            name: this.decoders[key].name
        }));
    }
}

module.exports = new DecoderService();
