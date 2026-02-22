// MILITARY GRADE SIMULATED TRAFFIC
// Frequencies in Hz

const SIMULATED_TRAFFIC = [
    // --- HFGCS (High Frequency Global Communications System) ---
    {
        frequency: 11175000, // 11.175 MHz - Primary HFGCS
        mode: 'USB',
        type: 'Military (HFGCS)',
        rssi: -55,
        messages: [
            "SKYKING SKYKING DO NOT ANSWER. TIME 34. AUTHENTICATION ALFA ROMEO TWO. I SAY AGAIN...",
            "MAINSAIL MAINSAIL THIS IS OFFSHORE. RADIO CHECK OVER.",
            "ALL STATIONS ALL STATIONS. STANDBY FOR EMERGENCY ACTION MESSAGE.",
            "JV2 JV2 THIS IS MAINSAIL. SIGNAL IS WEAK BUT READABLE. BREAK."
        ]
    },
    {
        frequency: 8992000, // 8.992 MHz - HFGCS Backup
        mode: 'USB',
        type: 'Military (HFGCS)',
        rssi: -65,
        messages: [
            "SKYKING SKYKING DO NOT ANSWER. MSG FOLLOWS. [ENCRYPTED BLOCK]",
            "PREAMBLE: Z4X Z4X. TIME 1205 ZULU. MESSAGE FOLLOWS.",
            "F7L F7L THIS IS MAINSAIL. DISREGARD LAST TRANSMISSION. OUT."
        ]
    },

    // --- NUMBERS STATIONS ---
    {
        frequency: 4625000, // 4.625 MHz - UVB-76 "The Buzzer"
        mode: 'AM',
        type: 'Numbers Station',
        rssi: -45,
        messages: [
            "UVB-76 UVB-76 93 882 NAIMINA 74 14 35 74",
            "MDZhB MDZhB 04 979 D-R-E-N-A-Z-H 14 88 22 91",
            "V-Zh-Ts-2 V-Zh-Ts-2 52 481 K-A-R-T-O-V-N-I-K",
            "[BUZZER TONE ACTIVE] ... [BUZZER TONE ACTIVE]"
        ]
    },
    {
        frequency: 5448000, // S06 "Russian Man"
        mode: 'AM',
        type: 'Numbers Station',
        rssi: -70,
        messages: [
            "543 211 543 211 543 211",
            "11223 44556 77889 00112",
            "PRIYOM. END OF MESSAGE."
        ]
    },

    // --- TACTICAL AIR (Simulated UHF/VHF) ---
    {
        frequency: 243000000, // 243.0 MHz - Military Air Distress (Guard)
        mode: 'AM',
        type: 'Mil-Air Emergency',
        rssi: -40,
        messages: [
            "MAYDAY MAYDAY. THIS IS VIPER 1-1. ENGINE FLAMEOUT. EJECTING.",
            "PAN PAN PAN. BOLT 3-2 EXPERIENCING HYDRAULIC FAILURE. RTB IMMEDIATELY.",
            "ANY STATION ON GUARD. THIS IS GHOST RIDER REQUESTING VECTOR.",
            "BEADWINDOW BEADWINDOW. LAST TRANSMISSION COMPROMISED."
        ]
    },
    {
        frequency: 315200000, // Simulated Air Combat Freq
        mode: 'AM',
        type: 'Mil-Air Tactical',
        rssi: -60,
        messages: [
            "FOX TWO FOX TWO. BANDIT AT BULLSEYE 090 FOR 20.",
            "RIFLE. GOOD HIT ON TARGET.",
            "DARKSTAR THIS IS HAWKEYE. PICTURE IS CLEAN.",
            "SCRAMBLE SCRAMBLE. VAMPIRE INBOUND. VAMPIRE INBOUND."
        ]
    },

    // --- MARITIME / NAVY ---
    {
        frequency: 156800000, // Ch 16 - Marine Distress
        mode: 'FM',
        type: 'Maritime',
        rssi: -50,
        messages: [
            "MAYDAY MAYDAY MAYDAY. THIS IS USS ARLEIGH BURKE. SIMULATED CASUALTY.",
            "SECURITE SECURITE. ALL SHIPS IN SECTOR 7. HAZARD TO NAVIGATION.",
            "COAST GUARD SECTOR SAN DIEGO. RADIO CHECK."
        ]
    }
];

module.exports = SIMULATED_TRAFFIC;
