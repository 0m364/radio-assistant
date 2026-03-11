const { decodeFromMorse, encodeToMorse } = require("./morse.js");

const cases = [
  {
    name: "basic phrase",
    text: "SOS",
    morse: "... --- ...",
  },
  {
    name: "words and punctuation",
    text: "Hello, world!",
    morse: ".... . .-.. .-.. --- --..-- / .-- --- .-. .-.. -.. -.-.--",
  },
  {
    name: "numbers",
    text: "2026",
    morse: "..--- ----- ..--- -....",
  },
  {
    name: "unknown characters",
    text: "Hello ~",
    morse: ".... . .-.. .-.. --- / ~",
    decodeExpected: "HELLO ~",
  },
];

const assertEqual = (actual, expected, label) => {
  if (actual !== expected) {
    throw new Error(`Failed: ${label}\nExpected: ${expected}\nActual: ${actual}`);
  }
};

cases.forEach((testCase) => {
  const encoded = encodeToMorse(testCase.text);
  assertEqual(encoded, testCase.morse, `${testCase.name} encode`);

  const decoded = decodeFromMorse(testCase.morse);
  const expectedDecode = testCase.decodeExpected || testCase.text.toUpperCase();
  assertEqual(decoded, expectedDecode, `${testCase.name} decode`);
});

console.log("All tests passed.");
