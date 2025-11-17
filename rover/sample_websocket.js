"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ws_1 = require("ws");
var SERVER_URL = process.env.WS_URL || 'ws://localhost:5000/ws';
var ROVER_IDENTIFIER = process.env.ROVER_ID || 'R_TEST_SIM';
var TELEMETRY_INTERVAL = 5000; // Send data every 5 seconds
var ws = null;
var assignedRoverId = null;
var telemetryInterval = null;
var reconnectTimeout = null;
var isConnected = false;
// State for realistic data simulation
var state = {
    batteryLevel: 95, // Start with 95% battery
    distanceTraveled: 0,
    trips: 0,
    currentLat: 34.0522,
    currentLon: -118.2437,
    currentX: 1.0,
    currentY: 0.0,
    currentZ: 23.0,
    status: 'idle',
};
// Generate realistic sensor data that changes gradually
function generateSensorData() {
    // Gradually decrease battery (0.1% per update)
    state.batteryLevel = Math.max(10, state.batteryLevel - 0.1);
    // Gradually move position (simulate movement)
    var moveAmount = 0.0001;
    state.currentLat += (Math.random() - 0.5) * moveAmount;
    state.currentLon += (Math.random() - 0.5) * moveAmount;
    state.currentX += (Math.random() - 0.5) * 0.1;
    state.currentY += (Math.random() - 0.5) * 0.1;
    // Increment distance traveled
    state.distanceTraveled += Math.random() * 0.5;
    // Occasionally complete a trip
    if (Math.random() < 0.01) {
        state.trips += 1;
        console.log('🔄 Trip completed! Total trips:', state.trips);
    }
    // Randomly change status
    if (Math.random() < 0.1) {
        state.status = Math.random() > 0.3 ? 'active' : 'idle';
    }
    return {
        temperature: parseFloat((20 + Math.random() * 5).toFixed(2)),
        speed: parseFloat((0.3 + Math.random() * 0.3).toFixed(2)),
        latitude: parseFloat(state.currentLat.toFixed(5)),
        longitude: parseFloat(state.currentLon.toFixed(5)),
        batteryLevel: Math.round(state.batteryLevel),
        signalStrength: Math.round(70 + Math.random() * 25),
        cpuUsage: parseFloat((30 + Math.random() * 40).toFixed(2)),
        memoryUsage: parseFloat((40 + Math.random() * 30).toFixed(2)),
        distanceTraveled: parseFloat(state.distanceTraveled.toFixed(2)),
        trips: state.trips,
        currentPosition: {
            x: parseFloat(state.currentX.toFixed(2)),
            y: parseFloat(state.currentY.toFixed(2)),
            z: parseFloat(state.currentZ.toFixed(2)),
        },
    };
}
function sendTelemetry() {
    if (!isConnected || !assignedRoverId || !ws || ws.readyState !== ws_1.default.OPEN) {
        console.log('⚠️ Skipping telemetry: Not connected or missing rover ID');
        return;
    }
    try {
        var sensorData = generateSensorData();
        // Send telemetry data
        ws.send(JSON.stringify({
            type: 'TELEMETRY',
            roverId: assignedRoverId,
            payload: { sensorData: sensorData },
            timestamp: Date.now(),
        }));
        // Send status update
        ws.send(JSON.stringify({
            type: 'STATUS_UPDATE',
            roverId: assignedRoverId,
            payload: { status: state.status },
            timestamp: Date.now(),
        }));
        console.log("\uD83D\uDCE1 Sent TELEMETRY & STATUS_UPDATE (Battery: ".concat(sensorData.batteryLevel, "%, Status: ").concat(state.status, ")"));
    }
    catch (error) {
        console.error('❌ Error sending telemetry:', error);
    }
}
function connect() {
    if (ws && ws.readyState === ws_1.default.OPEN) {
        console.log('Already connected');
        return;
    }
    console.log("\uD83D\uDD0C Connecting to ".concat(SERVER_URL, "..."));
    ws = new ws_1.default(SERVER_URL);
    ws.on('open', function () {
        console.log('✅ Connected to WebSocket server');
        isConnected = true;
        // Clear any reconnect timeout
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
        }
        // Send connection message
        ws.send(JSON.stringify({
            type: 'CONNECT',
            payload: {
                type: 'rover',
                identifier: ROVER_IDENTIFIER,
            },
            timestamp: Date.now(),
        }));
        console.log("\uD83D\uDCE4 Sent CONNECT message with identifier: ".concat(ROVER_IDENTIFIER));
    });
    ws.on('message', function (data) {
        var _a, _b;
        try {
            var msg = JSON.parse(data.toString());
            console.log('📥 Server message:', JSON.stringify(msg, null, 2));
            // Handle connection response
            if (msg.type === 'CONNECT' && ((_a = msg.payload) === null || _a === void 0 ? void 0 : _a.roverId)) {
                assignedRoverId = msg.payload.roverId;
                console.log("\uD83D\uDEF0\uFE0F Assigned Rover ID: ".concat(assignedRoverId));
                // Start sending telemetry data
                if (telemetryInterval) {
                    clearInterval(telemetryInterval);
                }
                telemetryInterval = setInterval(sendTelemetry, TELEMETRY_INTERVAL);
                // Send first telemetry immediately
                sendTelemetry();
            }
            // Handle commands
            if (msg.type === 'COMMAND' && ((_b = msg.payload) === null || _b === void 0 ? void 0 : _b.command)) {
                console.log("\uD83D\uDCE8 Received command: ".concat(msg.payload.command));
                // You can add command handling logic here
            }
        }
        catch (error) {
            console.error('❌ Error parsing message:', error);
        }
    });
    ws.on('close', function () {
        console.log('❌ Disconnected from server');
        isConnected = false;
        assignedRoverId = null;
        // Clear telemetry interval
        if (telemetryInterval) {
            clearInterval(telemetryInterval);
            telemetryInterval = null;
        }
        // Attempt to reconnect after 5 seconds
        if (!reconnectTimeout) {
            reconnectTimeout = setTimeout(function () {
                console.log('🔄 Attempting to reconnect...');
                reconnectTimeout = null;
                connect();
            }, 5000);
        }
    });
    ws.on('error', function (err) {
        console.error('❌ WebSocket Error:', err.message);
        isConnected = false;
    });
}
// Start connection
console.log('🚀 Starting WebSocket client...');
console.log("   Server: ".concat(SERVER_URL));
console.log("   Rover ID: ".concat(ROVER_IDENTIFIER));
connect();
// Handle graceful shutdown
process.on('SIGINT', function () {
    console.log('\n🛑 Shutting down...');
    if (telemetryInterval) {
        clearInterval(telemetryInterval);
    }
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
    }
    if (ws) {
        ws.close();
    }
    process.exit(0);
});
