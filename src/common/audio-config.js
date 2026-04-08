/**
 * Audio processing configuration constants.
 * These values can be tuned to improve Morse code decoding accuracy.
 */
const AUDIO_CONFIG = {
    defaultDot: 120,
    minDot: 60,
    dashRatio: 2.2,
    letterGapRatio: 3,
    wordGapRatio: 7,
};

module.exports = {
    AUDIO_CONFIG
};
