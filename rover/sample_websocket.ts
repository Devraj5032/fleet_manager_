import WebSocket from 'ws';

const SERVER_URL = process.env.WS_URL || 'ws://localhost:5000/ws';
const ROVER_IDENTIFIER = process.env.ROVER_ID || 'R_TEST_SIM';
const TELEMETRY_INTERVAL = 5000; // Send data every 5 seconds

let ws: any = null;
let assignedRoverId: number | null = null;
let telemetryInterval: NodeJS.Timeout | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let isConnected = false;

// State for realistic data simulation
let state = {
  batteryLevel: 95, // Start with 95% battery
  distanceTraveled: 0,
  trips: 0,
  currentLat: 34.0522,
  currentLon: -118.2437,
  currentX: 1.0,
  currentY: 0.0,
  currentZ: 23.0,
  status: 'idle' as 'idle' | 'active',
};

// Generate realistic sensor data that changes gradually
function generateSensorData() {
  // Gradually decrease battery (0.1% per update)
  state.batteryLevel = Math.max(10, state.batteryLevel - 0.1);
  
  // Gradually move position (simulate movement)
  const moveAmount = 0.0001;
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
  if (!isConnected || !assignedRoverId || !ws || ws.readyState !== WebSocket.OPEN) {
    console.log('⚠️ Skipping telemetry: Not connected or missing rover ID');
    return;
  }

  try {
    const sensorData = generateSensorData();

    // Send telemetry data
    ws.send(JSON.stringify({
      type: 'TELEMETRY',
      roverId: assignedRoverId,
      payload: { sensorData },
      timestamp: Date.now(),
    }));

    // Send status update
    ws.send(JSON.stringify({
      type: 'STATUS_UPDATE',
      roverId: assignedRoverId,
      payload: { status: state.status },
      timestamp: Date.now(),
    }));

    console.log(`📡 Sent TELEMETRY & STATUS_UPDATE (Battery: ${sensorData.batteryLevel}%, Status: ${state.status})`);
  } catch (error) {
    console.error('❌ Error sending telemetry:', error);
  }
}

function connect() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('Already connected');
    return;
  }

  console.log(`🔌 Connecting to ${SERVER_URL}...`);
  ws = new WebSocket(SERVER_URL);

  ws.on('open', () => {
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

    console.log(`📤 Sent CONNECT message with identifier: ${ROVER_IDENTIFIER}`);
  });

  ws.on('message', (data: any) => {
    try {
      const msg = JSON.parse(data.toString());
      console.log('📥 Server message:', JSON.stringify(msg, null, 2));

      // Handle connection response
      if (msg.type === 'CONNECT' && msg.payload?.roverId) {
        assignedRoverId = msg.payload.roverId;
        console.log(`🛰️ Assigned Rover ID: ${assignedRoverId}`);

        // Start sending telemetry data
        if (telemetryInterval) {
          clearInterval(telemetryInterval);
        }
        telemetryInterval = setInterval(sendTelemetry, TELEMETRY_INTERVAL);
        
        // Send first telemetry immediately
        sendTelemetry();
      }

      // Handle commands
      if (msg.type === 'COMMAND' && msg.payload?.command) {
        console.log(`📨 Received command: ${msg.payload.command}`);
        // You can add command handling logic here
      }
    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  });

  ws.on('close', () => {
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
      reconnectTimeout = setTimeout(() => {
        console.log('🔄 Attempting to reconnect...');
        reconnectTimeout = null;
        connect();
      }, 5000);
    }
  });

  ws.on('error', (err: Error) => {
    console.error('❌ WebSocket Error:', err.message);
    isConnected = false;
  });
}

// Start connection
console.log('🚀 Starting WebSocket client...');
console.log(`   Server: ${SERVER_URL}`);
console.log(`   Rover ID: ${ROVER_IDENTIFIER}`);
connect();

// Handle graceful shutdown
process.on('SIGINT', () => {
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
