import { decodeFromMorse, encodeToMorse, getGuideSamples } from "./morse.mjs";

const textInput = document.querySelector("#text-input");
const morseInput = document.querySelector("#morse-input");
const guideRow = document.querySelector("#guide-row");
const micToggle = document.querySelector("#mic-toggle");
const sysAudioToggle = document.querySelector("#sys-audio-toggle");
const micStatus = document.querySelector("#mic-status");
const fileInput = document.querySelector("#audio-file");
const fileStatus = document.querySelector("#file-status");
const meterBar = document.querySelector("#meter-bar");
const toneButton = document.querySelector("#tone-button");
const toneStatus = document.querySelector("#tone-status");
const toneFrequency = document.querySelector("#tone-frequency");
const toneValue = document.querySelector("#tone-value");
const spectrumCanvas = document.querySelector("#spectrum");
const spectrumCtx = spectrumCanvas.getContext("2d");

let lastEdited = "text";

const updateFromText = () => {
  if (lastEdited !== "text") return;
  const encoded = encodeToMorse(textInput.value);
  if (morseInput.value !== encoded) {
    morseInput.value = encoded;
  }
  scheduleLog("text", textInput.value, encoded);
};

const updateFromMorse = () => {
  if (lastEdited !== "morse") return;
  const decoded = decodeFromMorse(morseInput.value);
  if (textInput.value !== decoded) {
    textInput.value = decoded;
  }
  scheduleLog("morse", decoded, morseInput.value);
};

textInput.addEventListener("input", () => {
  lastEdited = "text";
  updateFromText();
});

morseInput.addEventListener("input", () => {
  lastEdited = "morse";
  updateFromMorse();
});

const renderGuide = () => {
  const samples = getGuideSamples();
  guideRow.innerHTML = "";
  samples.forEach((sample, index) => {
    const card = document.createElement("div");
    card.className = "guide-card";
    card.style.animationDelay = `${index * 0.05}s`;
    card.innerHTML = `<strong>${sample.label}</strong><span>${sample.code}</span>`;
    guideRow.appendChild(card);
  });
};

let logTimer = null;
let lastLogPayload = "";

const scheduleLog = (source, text, morse) => {
  const payload = JSON.stringify({ source, text, morse });
  if (payload === lastLogPayload) return;
  lastLogPayload = payload;

  if (logTimer) {
    clearTimeout(logTimer);
  }

  logTimer = setTimeout(async () => {
    try {
      await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app: "morse-translator",
          entry: { source, text, morse },
        }),
      });
    } catch (error) {
      // Ignore logging errors
    }
  }, 800);
};

renderGuide();
updateFromText();

const audioConfig = {
  defaultDot: 120,
  minDot: 60,
  dashRatio: 2.2,
  letterGapRatio: 3,
  wordGapRatio: 7,
};

const createAudioState = (startTime = performance.now()) => ({
  morseParts: [],
  currentLetter: "",
  toneDurations: [],
  isTone: false,
  lastChange: startTime,
  noiseFloor: 0.02,
});

const estimateDot = (state) => {
  if (!state.toneDurations.length) return audioConfig.defaultDot;
  const shortest = Math.min(...state.toneDurations);
  return Math.max(audioConfig.minDot, shortest);
};

const finalizeLetter = (state) => {
  if (state.currentLetter) {
    state.morseParts.push(state.currentLetter);
    state.currentLetter = "";
  }
};

const pushWordBreak = (state) => {
  if (state.morseParts[state.morseParts.length - 1] !== "/") {
    state.morseParts.push("/");
  }
};

const buildMorsePreview = (state) => {
  const parts = [...state.morseParts];
  if (state.currentLetter) parts.push(state.currentLetter);
  return parts.join(" ").replace(/\s+\/\s+/g, " / ").trim();
};

const updateOutputsFromAudio = (state) => {
  lastEdited = "audio";
  const morsePreview = buildMorsePreview(state);
  if (morseInput.value !== morsePreview) {
    morseInput.value = morsePreview;
  }
  const decoded = decodeFromMorse(morsePreview);
  if (textInput.value !== decoded) {
    textInput.value = decoded;
  }
  scheduleLog("audio", decoded, morsePreview);
};

const registerToneDuration = (state, duration) => {
  state.toneDurations.push(duration);
  if (state.toneDurations.length > 30) {
    state.toneDurations.shift();
  }
};

const handleGap = (state, gapMs) => {
  const dot = estimateDot(state);
  if (gapMs >= dot * audioConfig.wordGapRatio) {
    finalizeLetter(state);
    pushWordBreak(state);
    return "word";
  }
  if (gapMs >= dot * audioConfig.letterGapRatio) {
    finalizeLetter(state);
    return "letter";
  }
  return "none";
};

const classifyTone = (state, duration) => {
  const dot = estimateDot(state);
  return duration >= dot * audioConfig.dashRatio ? "-" : ".";
};

const processLevel = (state, level, timeMs) => {
  const toneThreshold = state.noiseFloor * 3 + 0.01;
  const isToneNow = level > toneThreshold;

  if (!isToneNow) {
    state.noiseFloor = state.noiseFloor * 0.95 + level * 0.05;
  }

  if (isToneNow === state.isTone) return;

  const duration = timeMs - state.lastChange;
  state.lastChange = timeMs;

  if (state.isTone) {
    registerToneDuration(state, duration);
    const symbol = classifyTone(state, duration);
    state.currentLetter += symbol;
    updateOutputsFromAudio(state);
  } else {
    const gapType = handleGap(state, duration);
    if (gapType !== "none") {
      updateOutputsFromAudio(state);
    }
  }

  state.isTone = isToneNow;
};

let audioContext = null;
let micStream = null;
let analyser = null;
let dataArray = null;
let micAnimation = null;
let micState = createAudioState();
let spectrumAnalyser = null;
let spectrumAnimation = null;
let toneOscillator = null;
let toneGain = null;
let toneAnalyser = null;
let toneActive = false;

const updateMeter = (level) => {
  const width = Math.min(100, Math.max(0, level * 320));
  meterBar.style.width = `${width}%`;
};

const resizeSpectrum = () => {
  const ratio = window.devicePixelRatio || 1;
  const rect = spectrumCanvas.getBoundingClientRect();
  spectrumCanvas.width = Math.max(320, Math.floor(rect.width * ratio));
  spectrumCanvas.height = Math.max(120, Math.floor(rect.height * ratio));
  spectrumCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
};

const setSpectrumAnalyser = (nextAnalyser) => {
  spectrumAnalyser = nextAnalyser;
  if (spectrumAnalyser && !spectrumAnimation) {
    startSpectrum();
  }
};

const startSpectrum = () => {
  const draw = () => {
    if (!spectrumAnalyser) {
      spectrumCtx.clearRect(0, 0, spectrumCanvas.width, spectrumCanvas.height);
      spectrumAnimation = requestAnimationFrame(draw);
      return;
    }

    const bufferLength = spectrumAnalyser.frequencyBinCount;
    const data = new Uint8Array(bufferLength);
    spectrumAnalyser.getByteFrequencyData(data);

    const width = spectrumCanvas.clientWidth;
    const height = spectrumCanvas.clientHeight;
    spectrumCtx.clearRect(0, 0, width, height);
    const barCount = Math.floor(width / 6);
    const step = Math.max(1, Math.floor(bufferLength / barCount));
    for (let i = 0; i < barCount; i += 1) {
      const value = data[i * step] / 255;
      const barHeight = value * height;
      spectrumCtx.fillStyle = `rgba(44, 156, 240, ${0.2 + value * 0.8})`;
      spectrumCtx.fillRect(i * 6, height - barHeight, 4, barHeight);
    }
    spectrumAnimation = requestAnimationFrame(draw);
  };

  spectrumAnimation = requestAnimationFrame(draw);
};

const startMic = async (useSystem = false) => {
  if (micStream) return;
  micStatus.textContent = useSystem ? "Requesting audio..." : "Requesting mic...";
  try {
    if (useSystem) {
      micStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });
    } else {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    if (micStream.getAudioTracks().length === 0) {
      throw new Error("No audio track selected");
    }

    audioContext = audioContext || new AudioContext();
    const source = audioContext.createMediaStreamSource(micStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    dataArray = new Uint8Array(analyser.fftSize);
    source.connect(analyser);
    micState = createAudioState();
    micStatus.textContent = "Listening";
    if (useSystem) {
      sysAudioToggle.textContent = "Stop Capture";
      micToggle.disabled = true;
    } else {
      micToggle.textContent = "Stop Mic";
      sysAudioToggle.disabled = true;
    }
    setSpectrumAnalyser(analyser);

    const loop = () => {
      analyser.getByteTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i += 1) {
        const value = (dataArray[i] - 128) / 128;
        sum += value * value;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      updateMeter(rms);
      processLevel(micState, rms, performance.now());
      micAnimation = requestAnimationFrame(loop);
    };

    micAnimation = requestAnimationFrame(loop);
  } catch (error) {
    micStatus.textContent = "Audio blocked";
    micToggle.textContent = "Start Mic";
    sysAudioToggle.textContent = "Capture Tab";
    micToggle.disabled = false;
    sysAudioToggle.disabled = false;
  }
};

const stopMic = () => {
  if (micAnimation) {
    cancelAnimationFrame(micAnimation);
    micAnimation = null;
  }
  if (micStream) {
    micStream.getTracks().forEach((track) => track.stop());
    micStream = null;
  }
  updateMeter(0);
  micStatus.textContent = "Audio idle";
  micToggle.textContent = "Start Mic";
  sysAudioToggle.textContent = "Capture Tab";
  micToggle.disabled = false;
  sysAudioToggle.disabled = false;
  if (spectrumAnalyser === analyser) {
    setSpectrumAnalyser(toneActive ? toneAnalyser : null);
  }
};

micToggle.addEventListener("click", () => {
  if (micStream) {
    stopMic();
  } else {
    startMic(false);
  }
});

sysAudioToggle.addEventListener("click", () => {
  if (micStream) {
    stopMic();
  } else {
    startMic(true);
  }
});

const decodeAudioBuffer = (audioBuffer) => {
  const channelCount = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;
  const mix = new Float32Array(length);

  for (let channel = 0; channel < channelCount; channel += 1) {
    const data = audioBuffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      mix[i] += data[i] / channelCount;
    }
  }

  const frameSize = 1024;
  const hop = 256;
  const levels = [];
  for (let i = 0; i + frameSize <= length; i += hop) {
    let sum = 0;
    for (let j = 0; j < frameSize; j += 1) {
      const value = mix[i + j];
      sum += value * value;
    }
    levels.push(Math.sqrt(sum / frameSize));
  }

  const stepMs = (hop / sampleRate) * 1000;
  const state = createAudioState(0);
  let timeMs = 0;
  levels.forEach((level) => {
    processLevel(state, level, timeMs);
    timeMs += stepMs;
  });

  finalizeLetter(state);
  updateOutputsFromAudio(state);
};

fileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) {
    fileStatus.textContent = "No file selected";
    return;
  }

  fileStatus.textContent = `Loading ${file.name}...`;
  try {
    audioContext = audioContext || new AudioContext();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    decodeAudioBuffer(audioBuffer);
    fileStatus.textContent = `Decoded ${file.name}`;
  } catch (error) {
    fileStatus.textContent = "Could not decode file";
  }
});

const startTone = async () => {
  if (toneActive) return;
  audioContext = audioContext || new AudioContext();
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }
  toneOscillator = audioContext.createOscillator();
  toneGain = audioContext.createGain();
  toneAnalyser = audioContext.createAnalyser();
  toneAnalyser.fftSize = 2048;
  toneOscillator.type = "sine";
  toneOscillator.frequency.value = Number(toneFrequency.value);
  toneGain.gain.value = 0.18;
  toneOscillator.connect(toneGain);
  toneGain.connect(toneAnalyser);
  toneAnalyser.connect(audioContext.destination);
  toneOscillator.start();
  toneActive = true;
  toneStatus.textContent = "Tone on";
  setSpectrumAnalyser(toneAnalyser);
};

const stopTone = () => {
  if (!toneActive) return;
  toneOscillator.stop();
  toneOscillator.disconnect();
  toneGain.disconnect();
  toneAnalyser.disconnect();
  toneOscillator = null;
  toneGain = null;
  toneAnalyser = null;
  toneActive = false;
  toneStatus.textContent = "Tone idle";
  if (spectrumAnalyser) {
    setSpectrumAnalyser(micStream ? analyser : null);
  }
};

toneButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  startTone();
});

toneButton.addEventListener("pointerup", stopTone);
toneButton.addEventListener("pointerleave", stopTone);
toneButton.addEventListener("pointercancel", stopTone);
toneButton.addEventListener("touchend", stopTone);

toneFrequency.addEventListener("input", () => {
  const value = toneFrequency.value;
  toneValue.textContent = `${value} Hz`;
  if (toneOscillator) {
    toneOscillator.frequency.value = Number(value);
  }
});

window.addEventListener("resize", resizeSpectrum);
resizeSpectrum();
