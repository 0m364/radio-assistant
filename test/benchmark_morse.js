const { decodeFromMorse } = require('../src/common/morse.js');

const shortMorse = "... --- ...";
const longMorse = "... --- ... / ".repeat(1000) + "... --- ...";
const complexMorse = ".... . .-.. .-.. --- / .-- --- .-. .-.. -.. / .... . .-. . / .. ... / .- / ...- . .-. -.-- / .-.. --- -. --. / -- . ... ... .- --. . / .-- .. - .... / -- ..- .-.. - .. .--. .-.. . / .-- --- .-. -.. ... / .- -. -.. / ... .--. .- -.-. . ...".repeat(100);

function runBenchmark(name, data, iterations = 1000) {
    console.log(`Benchmarking ${name} (${data.length} chars, ${iterations} iterations)...`);

    // Warmup
    for (let i = 0; i < 100; i++) {
        decodeFromMorse(data);
    }

    const start = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
        decodeFromMorse(data);
    }
    const end = process.hrtime.bigint();

    const durationMs = Number(end - start) / 1e6;
    const avgMs = durationMs / iterations;

    console.log(`Total: ${durationMs.toFixed(3)} ms`);
    console.log(`Average: ${avgMs.toFixed(5)} ms`);
    console.log('');
    return avgMs;
}

console.log('--- Morse Decoder Baseline Benchmark ---');
runBenchmark('Short', shortMorse, 100000);
runBenchmark('Long', longMorse, 1000);
runBenchmark('Complex', complexMorse, 1000);
