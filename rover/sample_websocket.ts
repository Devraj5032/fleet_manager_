const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:5000/ws');

let assignedRoverId = null;

// Generate random sensor data
function generateSensorData() {
  return {
    temperature: +(20 + Math.random() * 5).toFixed(2),
    speed: +(0.3 + Math.random() * 0.2).toFixed(2),
    latitude: +(34.0522 + (Math.random() * 0.001 - 0.0005)).toFixed(5),
    longitude: +(-118.2437 + (Math.random() * 0.001 - 0.0005)).toFixed(5),
    batteryLevel: +(85 + Math.random() * 10).toFixed(2),
    signalStrength: +(70 + Math.random() * 20).toFixed(2),
    cpuUsage: +(30 + Math.random() * 40).toFixed(2),
    memoryUsage: +(40 + Math.random() * 30).toFixed(2),
    distanceTraveled: +(Math.random() * 100).toFixed(2),
    trips: Math.floor(Math.random() * 5),
    currentPosition: {
      x: +(Math.random() * 10).toFixed(2),
      y: +(Math.random() * 10).toFixed(2),
      z: +(Math.random() * 1).toFixed(2),
    },
  };
}

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server');

  ws.send(JSON.stringify({
    type: 'CONNECT',
    payload: {
      type: 'rover',
      identifier: 'R_TEST_SIM',
    },
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());

  // Assign roverId once after CONNECT
  if (msg.type === 'CONNECT' && msg.payload?.roverId) {
    assignedRoverId = msg.payload.roverId;
    console.log('🛰️ Assigned Rover ID:', assignedRoverId);

    setInterval(() => {
      if (!assignedRoverId) return;

      const sensorData = generateSensorData();

      ws.send(JSON.stringify({
        type: 'TELEMETRY',
        roverId: assignedRoverId,
        payload: { sensorData },
      }));

      ws.send(JSON.stringify({
        type: 'STATUS_UPDATE',
        roverId: assignedRoverId,
        payload: { status: Math.random() > 0.2 ? 'active' : 'idle' }, // sometimes idle
      }));

      console.log('📡 Sent TELEMETRY & STATUS_UPDATE');
    }, 5000);
  }

  console.log('📥 Server:', data.toString());
});

ws.on('close', () => {
  console.log('❌ Disconnected from server');
});

ws.on('error', (err) => {
  console.error('❌ WebSocket Error:', err.message);
});
