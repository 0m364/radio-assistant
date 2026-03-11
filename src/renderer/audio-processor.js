var EventEmitter = require('events');
var { decodeFromMorse } = require('../common/morse.js');
var { AUDIO_CONFIG } = require('../common/audio-config.js');

var PCM_8BIT_SCALE = 1 / 128;

class AudioProcessor extends EventEmitter {
    constructor() {
        super();
        this.audioContext = null;
        this.micStream = null;
        this.analyser = null;
        this.dataArray = null;
        this.micAnimation = null;
        this.micState = null;

        this.toneOscillator = null;
        this.toneGain = null;
        this.toneAnalyser = null;
        this.toneActive = false;

        this.audioConfig = { ...AUDIO_CONFIG };
    }

    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new AudioContext();
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        return this.audioContext;
    }

    estimateDot(state) {
        if (!state.toneDurations.length) return this.audioConfig.defaultDot;
        const shortest = Math.min(...state.toneDurations);
        return Math.max(this.audioConfig.minDot, shortest);
    }

    finalizeLetter(state) {
        if (state.currentLetter) {
            state.morseParts.push(state.currentLetter);
            state.currentLetter = "";
        }
    }

    pushWordBreak(state) {
        if (state.morseParts[state.morseParts.length - 1] !== "/") {
            state.morseParts.push("/");
        }
    }

    buildMorsePreview(state) {
        const parts = [...state.morseParts];
        if (state.currentLetter) parts.push(state.currentLetter);
        return parts.join(" ").replace(/\s+\/\s+/g, " / ").trim();
    }

    emitUpdates(state) {
        const morsePreview = this.buildMorsePreview(state);
        const decoded = decodeFromMorse(morsePreview);
        this.emit('morse', morsePreview);
        this.emit('text', decoded);
    }

    registerToneDuration(state, duration) {
        state.toneDurations.push(duration);
        if (state.toneDurations.length > 30) {
            state.toneDurations.shift();
        }
    }

    handleGap(state, gapMs) {
        const dot = this.estimateDot(state);
        if (gapMs >= dot * this.audioConfig.wordGapRatio) {
            this.finalizeLetter(state);
            this.pushWordBreak(state);
            return "word";
        }
        if (gapMs >= dot * this.audioConfig.letterGapRatio) {
            this.finalizeLetter(state);
            return "letter";
        }
        return "none";
    }

    classifyTone(state, duration) {
        const dot = this.estimateDot(state);
        return duration >= dot * this.audioConfig.dashRatio ? "-" : ".";
    }

    processLevel(state, level, timeMs) {
        const toneThreshold = state.noiseFloor * 3 + 0.01;
        const isToneNow = level > toneThreshold;

        if (!isToneNow) {
            state.noiseFloor = state.noiseFloor * 0.95 + level * 0.05;
        }

        if (isToneNow === state.isTone) return;

        const duration = timeMs - state.lastChange;
        state.lastChange = timeMs;

        if (state.isTone) {
            this.registerToneDuration(state, duration);
            const symbol = this.classifyTone(state, duration);
            state.currentLetter += symbol;
            this.emitUpdates(state);
        } else {
            const gapType = this.handleGap(state, duration);
            if (gapType !== "none") {
                this.emitUpdates(state);
            }
        }

        state.isTone = isToneNow;
    }

    createAudioState(startTime = performance.now()) {
        return {
            morseParts: [],
            currentLetter: "",
            toneDurations: [],
            isTone: false,
            lastChange: startTime,
            noiseFloor: 0.02,
        };
    }

    async startMic(useSystem = false) {
        if (this.micStream) return;
        this.emit('status', useSystem ? "Requesting audio..." : "Requesting mic...");

        try {
            if (useSystem) {
                this.micStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                    }
                });
            } else {
                this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }

            if (this.micStream.getAudioTracks().length === 0) {
                throw new Error("No audio track selected");
            }

            this.initAudioContext();
            const source = this.audioContext.createMediaStreamSource(this.micStream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.dataArray = new Uint8Array(this.analyser.fftSize);
            source.connect(this.analyser);

            this.micState = this.createAudioState();
            this.emit('status', 'Listening');
            this.emit('analyser', this.analyser);

            const loop = () => {
                this.analyser.getByteTimeDomainData(this.dataArray);
                let sum = 0;
                const len = this.dataArray.length;
                let i = 0;

                // Unroll loop for performance since this runs ~60fps
                for (; i <= len - 8; i += 8) {
                    const v0 = this.dataArray[i] - 128;
                    const v1 = this.dataArray[i + 1] - 128;
                    const v2 = this.dataArray[i + 2] - 128;
                    const v3 = this.dataArray[i + 3] - 128;
                    const v4 = this.dataArray[i + 4] - 128;
                    const v5 = this.dataArray[i + 5] - 128;
                    const v6 = this.dataArray[i + 6] - 128;
                    const v7 = this.dataArray[i + 7] - 128;
                    sum += v0 * v0 + v1 * v1 + v2 * v2 + v3 * v3 + v4 * v4 + v5 * v5 + v6 * v6 + v7 * v7;
                }
                for (; i < len; i += 1) {
                    const v = this.dataArray[i] - 128;
                    sum += v * v;
                }

                const rms = Math.sqrt(sum / len) * PCM_8BIT_SCALE;
                this.emit('level', rms);
                this.processLevel(this.micState, rms, performance.now());
                this.micAnimation = requestAnimationFrame(loop);
            };

            this.micAnimation = requestAnimationFrame(loop);
        } catch (error) {
            console.error(error);
            this.emit('status', "Audio blocked");
            this.emit('error', error);
        }
    }

    stopMic() {
        if (this.micAnimation) {
            cancelAnimationFrame(this.micAnimation);
            this.micAnimation = null;
        }
        if (this.micStream) {
            this.micStream.getTracks().forEach((track) => track.stop());
            this.micStream = null;
        }
        this.emit('level', 0);
        this.emit('status', "Audio idle");

        // If tone is active, revert analyser to tone analyser
        if (this.toneActive) {
            this.emit('analyser', this.toneAnalyser);
        } else {
            this.emit('analyser', null);
        }
    }

    startRecording() {
        if (!this.micStream) return;
        try {
            this.mediaRecorder = new MediaRecorder(this.micStream);
            this.recordedChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
                this.emit('recording-complete', blob);
                this.recordedChunks = [];
            };

            this.mediaRecorder.start();
            this.emit('status', "Recording started");
        } catch (e) {
            console.error("Recording error:", e);
            this.emit('error', e);
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            this.emit('status', "Recording saved");
        }
    }

    async startTone(frequency) {
        if (this.toneActive) return;
        this.initAudioContext();

        this.toneOscillator = this.audioContext.createOscillator();
        this.toneGain = this.audioContext.createGain();
        this.toneAnalyser = this.audioContext.createAnalyser();
        this.toneAnalyser.fftSize = 2048;

        this.toneOscillator.type = "sine";
        this.toneOscillator.frequency.value = Number(frequency);
        this.toneGain.gain.value = 0.18;

        this.toneOscillator.connect(this.toneGain);
        this.toneGain.connect(this.toneAnalyser);
        this.toneAnalyser.connect(this.audioContext.destination);

        this.toneOscillator.start();
        this.toneActive = true;
        this.emit('tone-status', "Tone on");
        this.emit('analyser', this.toneAnalyser);
    }

    stopTone() {
        if (!this.toneActive) return;
        this.toneOscillator.stop();
        this.toneOscillator.disconnect();
        this.toneGain.disconnect();
        this.toneAnalyser.disconnect();

        this.toneOscillator = null;
        this.toneGain = null;
        this.toneAnalyser = null;
        this.toneActive = false;

        this.emit('tone-status', "Tone idle");

        // Revert to mic analyser if mic is active
        if (this.micStream) {
            this.emit('analyser', this.analyser);
        } else {
            this.emit('analyser', null);
        }
    }

    setToneFrequency(freq) {
        if (this.toneOscillator) {
            this.toneOscillator.frequency.value = Number(freq);
        }
    }
}

module.exports = new AudioProcessor();
