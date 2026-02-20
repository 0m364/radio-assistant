class RadioService {
    constructor() {
        this.state = {
            frequency: 144000000, // Hz
            mode: 'FM',
            bandwidth: 12000,
            active: false
        };
        this.listeners = [];
    }

    setFrequency(freq) {
        this.state.frequency = freq;
        this.notify();
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
}

module.exports = new RadioService();
