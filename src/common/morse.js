const MORSE_MAP = {
  A: ".-",
  B: "-...",
  C: "-.-.",
  D: "-..",
  E: ".",
  F: "..-.",
  G: "--.",
  H: "....",
  I: "..",
  J: ".---",
  K: "-.-",
  L: ".-..",
  M: "--",
  N: "-.",
  O: "---",
  P: ".--.",
  Q: "--.-",
  R: ".-.",
  S: "...",
  T: "-",
  U: "..-",
  V: "...-",
  W: ".--",
  X: "-..-",
  Y: "-.--",
  Z: "--..",
  0: "-----",
  1: ".----",
  2: "..---",
  3: "...--",
  4: "....-",
  5: ".....",
  6: "-....",
  7: "--...",
  8: "---..",
  9: "----.",
  ".": ".-.-.-",
  ",": "--..--",
  "?": "..--..",
  "!": "-.-.--",
  ":": "---...",
  ";": "-.-.-.",
  "(": "-.--.",
  ")": "-.--.-",
  "'": ".----.",
  "\"": ".-..-.",
  "/": "-..-.",
  "@": ".--.-.",
  "=": "-...-",
  "+": ".-.-.",
  "-": "-....-",
};

const REVERSE_MAP = Object.entries(MORSE_MAP).reduce((acc, [char, code]) => {
  acc[code] = char;
  return acc;
}, {});

function encodeToMorse(text) {
  if (!text) return "";

  return text
    .toUpperCase()
    .split("")
    .map((char) => {
      if (char === " ") return "/";
      return MORSE_MAP[char] || "?";
    })
    .join(" ")
    .replace(/\s+\/\s+/g, " / ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function decodeFromMorse(morse) {
  if (!morse) return "";

  const normalized = morse
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "";

  const words = normalized.split(/\s*\/\s*/);
  return words
    .map((word) => {
      if (!word) return "";
      return word
        .split(" ")
        .filter(Boolean)
        .map((code) => REVERSE_MAP[code] || "?")
        .join("");
    })
    .join(" ")
    .trim();
}

function getGuideSamples() {
  return [
    { label: "A", code: MORSE_MAP.A },
    { label: "S", code: MORSE_MAP.S },
    { label: "T", code: MORSE_MAP.T },
    { label: "O", code: MORSE_MAP.O },
    { label: "0", code: MORSE_MAP[0] },
    { label: "1", code: MORSE_MAP[1] },
    { label: "?", code: MORSE_MAP["?"] },
    { label: "!", code: MORSE_MAP["!"] },
  ];
}

module.exports = {
  encodeToMorse,
  decodeFromMorse,
  getGuideSamples
};
