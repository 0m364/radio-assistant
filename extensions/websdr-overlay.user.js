// ==UserScript==
// @name         AI SIGINT TERMINAL - WebSDR Bridge
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Connects WebSDR to the local AI SIGINT TERMINAL
// @match        *://*/*websdr*
// @match        *://websdr.*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log("SIGINT TERMINAL: WebSDR Bridge initialized");

    let ws = null;
    let isConnected = false;
    let lastKnownFreq = 0;

    // Wait for WebSDR to load
    setTimeout(initWebSocket, 2000);

    function initWebSocket() {
        ws = new WebSocket('ws://localhost:3456');

        ws.onopen = function() {
            console.log("SIGINT TERMINAL: Connected to local bridge");
            isConnected = true;
            pollSdr(); // Start polling WebSDR UI for frequency changes
        };

        ws.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'tune') {
                    console.log("SIGINT TERMINAL: Received tune command", data.frequency);
                    setSdrFrequency(data.frequency);
                }
            } catch (e) {
                console.error("SIGINT TERMINAL: Error parsing WS message", e);
            }
        };

        ws.onclose = function() {
            console.log("SIGINT TERMINAL: Disconnected from local bridge");
            isConnected = false;
            // Attempt reconnect
            setTimeout(initWebSocket, 5000);
        };

        ws.onerror = function() {
            // Error handled by onclose
        };
    }

    // Attempt to parse frequency from WebSDR UI
    function getSdrFrequency() {
        // Different WebSDR versions use different elements
        // This attempts to cover the standard Pieter-Tjerk de Boer WebSDR
        let freqInput = document.form1 && document.form1.frequency;
        if (freqInput) {
            return Math.floor(parseFloat(freqInput.value) * 1000); // kHz to Hz
        }

        // Alternate WebSDR layouts
        const freqText = document.getElementById('freqdisplay');
        if (freqText) {
             const parts = freqText.textContent.split(' ');
             if (parts.length > 0) {
                 return Math.floor(parseFloat(parts[0]) * 1000);
             }
        }
        return 0;
    }

    // Attempt to set frequency in WebSDR UI
    function setSdrFrequency(freqHz) {
        const freqKHz = freqHz / 1000.0;

        // Standard WebSDR
        if (window.setfreqif) {
            window.setfreqif(freqKHz);
            return;
        }

        // Fallback: Try setting input and dispatching event
        let freqInput = document.form1 && document.form1.frequency;
        if (freqInput) {
            freqInput.value = freqKHz;
            if (window.setfreq) window.setfreq(freqKHz);
        }
    }

    // Poll the WebSDR interface to see if user changed freq
    function pollSdr() {
        if (!isConnected) return;

        const currentFreq = getSdrFrequency();
        if (currentFreq > 0 && currentFreq !== lastKnownFreq) {
            lastKnownFreq = currentFreq;
            // Send back to terminal
            ws.send(JSON.stringify({
                type: 'sdr_state',
                frequency: currentFreq
            }));
        }

        setTimeout(pollSdr, 500);
    }

})();
