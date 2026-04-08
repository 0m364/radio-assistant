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

const REVERSE_MAP = {};
for (const char in MORSE_MAP) {
  REVERSE_MAP[MORSE_MAP[char]] = char;
}

function encodeToMorse(text) {
  if (!text) return "";

  return text
    .toUpperCase()
    .split("")
    .map((char) => {
      if (char === " ") return "/";
      return MORSE_MAP[char] || char;
    })
    .join(" ")
    .replace(/\s+\/\s+/g, " / ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Decodes Morse code into text using an optimized imperative loop.
 * This avoids multiple intermediate array allocations and string transformations.
 */
function decodeFromMorse(morse) {
  if (!morse) return "";

  const result = [];
  let word = "";
  let code = "";
  let hasWord = false;

  for (let i = 0; i < morse.length; i++) {
    const char = morse[i];
    if (char === "/") {
      if (code) {
        word += REVERSE_MAP[code] || code;
        code = "";
        hasWord = true;
      }
      if (hasWord || result.length > 0) {
        result.push(word);
        word = "";
        hasWord = false;
      }
    } else if (char === " " || char === "\n" || char === "\r" || char === "\t") {
      if (code) {
        word += REVERSE_MAP[code] || code;
        code = "";
        hasWord = true;
      }
    } else {
      code += char;
    }
  }

  // Final flush of any pending code and word
  if (code) {
    word += REVERSE_MAP[code] || code;
    hasWord = true;
  }
  if (hasWord || result.length > 0) {
    result.push(word);
  }

  return result.join(" ").trim();
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
