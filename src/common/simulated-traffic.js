// Simulated Radio Traffic Data
const SIMULATED_TRAFFIC = [
    {
        frequency: 144000000,
        mode: 'FM',
        type: 'Civilian',
        rssi: -70,
        messages: [
            "CQ CQ CQ This is KG7JKA calling any station",
            "Hearing you loud and clear over",
            "Can you repeat the coordinates over",
            "Testing 1 2 3",
            "Traffic is heavy on I-5 South due to accident",
            "73 to all stations monitoring"
        ]
    },
    {
        frequency: 145500000,
        mode: 'FM',
        type: 'Emergency',
        rssi: -50,
        messages: [
            "MAYDAY MAYDAY This is Vessel SEA STAR taking on water",
            "Position 34.05 North 118.25 West",
            "Requesting immediate assistance",
            "Coast Guard copy your distress call",
            "All stations maintain silence for emergency traffic"
        ]
    },
    {
        frequency: 146520000,
        mode: 'FM',
        type: 'Civilian',
        rssi: -85,
        messages: [
            "Checking into the net",
            "Signal report is 5 by 9",
            "Anyone copy my last transmission?",
            "QSL on the contact"
        ]
    },
    {
        frequency: 462562500, // FRS Channel 1
        mode: 'FM',
        type: 'Civilian',
        rssi: -60,
        messages: [
            "Kids come back to base camp over",
            "Did you bring the extra batteries?",
            "Radio check over",
            "Roger that"
        ]
    },
    {
        frequency: 155000000, // Police/Fire range (Simulated)
        mode: 'FM',
        type: 'Public Safety',
        rssi: -40,
        messages: [
            "Dispatch to Unit 1 respond to 123 Main St",
            "Subject is moving North on 4th Ave",
            "Requesting backup code 3",
            "Status clear return to patrol"
        ]
    },
    {
        frequency: 121500000, // Air Emergency
        mode: 'AM',
        type: 'Aviation Emergency',
        rssi: -55,
        messages: [
            "MAYDAY MAYDAY Cessna 172 engine failure",
            "Attempting emergency landing on highway",
            "Souls on board: 2",
            "Altitude 2000 feet dropping fast"
        ]
    }
];

module.exports = SIMULATED_TRAFFIC;
