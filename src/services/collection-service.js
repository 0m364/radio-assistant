const EventEmitter = require('events');
const RadioService = require('./radio-service.js');
const DecoderService = require('./decoder-service.js');
const AIService = require('./ai-service.js');

class CollectionService extends EventEmitter {
    constructor() {
        super();
        this.active = false;
        this.scanTimeout = null;
        this.collectionTimeout = null;
        this.isCollecting = false;
        this.collectionDelay = 2000; // Delay before resuming scan

        // Subscribe to RadioService to detect when scan stops on signal
        RadioService.subscribe((state) => {
            if (this.active && !state.isScanning && state.isSignalPresent && !this.isCollecting) {
                // Scan stopped on signal, start collection
                this.collect();
            }
        });
    }

    start() {
        if (this.active) return;
        this.active = true;
        this.emit('status', 'Collection Active');
        this.startCycle();
    }

    stop() {
        this.active = false;
        if (this.scanTimeout) clearTimeout(this.scanTimeout);
        if (this.collectionTimeout) clearTimeout(this.collectionTimeout);
        this.cleanupCollectionListener();
        RadioService.stopScan();
        this.emit('status', 'Collection Stopped');
    }

    startCycle() {
        if (!this.active) return;

        // If signal is already present, collect it first
        if (RadioService.getState().isSignalPresent) {
            this.collect();
        } else {
            // Start scanning
            this.emit('status', 'Scanning...');
            RadioService.startScan();
        }
    }

    collect() {
        this.isCollecting = true;
        this.emit('status', 'Analyzing Signal...');

        // Setup listener for decoded messages
        const onDecoded = (data) => {
            this.handleDecoded(data);
        };
        DecoderService.on('decoded', onDecoded);
        this.activeListener = onDecoded;

        // Timeout if no decode in 10 seconds
        this.collectionTimeout = setTimeout(() => {
            this.cleanupCollectionListener();
            this.isCollecting = false;
            // Nothing decoded, resume scan
            console.log("Collection timed out, resuming scan...");
            this.emit('status', 'No Decode - Resuming...');

            this.scanTimeout = setTimeout(() => {
                this.startCycle();
            }, 1000);
        }, 10000);
    }

    cleanupCollectionListener() {
        if (this.activeListener) {
            DecoderService.off('decoded', this.activeListener);
            this.activeListener = null;
        }
        if (this.collectionTimeout) {
            clearTimeout(this.collectionTimeout);
            this.collectionTimeout = null;
        }
    }

    async handleDecoded(data) {
        this.cleanupCollectionListener();

        // Check if we are still active (user might have stopped)
        if (!this.active) {
            this.isCollecting = false;
            return;
        }

        // Analyze
        try {
            const analysis = await AIService.analyzeTraffic(data.text);

            this.emit('collection-hit', {
                decoded: data,
                analysis: analysis
            });
            this.emit('status', 'Hit Logged');
        } catch (e) {
            console.error("Analysis failed", e);
            this.emit('status', 'Analysis Failed');
        }

        this.isCollecting = false;
        // Resume scan after a short delay
        this.scanTimeout = setTimeout(() => {
            this.startCycle();
        }, this.collectionDelay);
    }
}

module.exports = new CollectionService();
