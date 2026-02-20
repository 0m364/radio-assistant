class SpectrumVisualizer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.analyser = null;
        this.animationId = null;
        this.isRunning = false;

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    setAnalyser(analyser) {
        this.analyser = analyser;
    }

    resize() {
        const ratio = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = Math.max(320, Math.floor(rect.width * ratio));
        this.canvas.height = Math.max(120, Math.floor(rect.height * ratio));
        this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.draw();
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    draw() {
        if (!this.isRunning) return;

        if (!this.analyser) {
            this.ctx.clearRect(0, 0, this.canvas.width / window.devicePixelRatio, this.canvas.height / window.devicePixelRatio);
            this.animationId = requestAnimationFrame(() => this.draw());
            return;
        }

        const bufferLength = this.analyser.frequencyBinCount;
        const data = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(data);

        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;

        this.ctx.clearRect(0, 0, width, height);

        const barCount = Math.floor(width / 6);
        const step = Math.max(1, Math.floor(bufferLength / barCount));

        for (let i = 0; i < barCount; i += 1) {
            const value = data[i * step] / 255;
            const barHeight = value * height;
            this.ctx.fillStyle = `rgba(44, 156, 240, ${0.2 + value * 0.8})`;
            this.ctx.fillRect(i * 6, height - barHeight, 4, barHeight);
        }

        this.animationId = requestAnimationFrame(() => this.draw());
    }
}

module.exports = SpectrumVisualizer;
