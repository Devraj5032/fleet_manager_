import * as zlib from 'zlib';

import WebSocket from 'ws';
import rclnodejs from 'rclnodejs';
import * as fs from 'fs';
import path from 'path';
import { PassThrough } from 'stream';

interface SensorData {
  temperature?: number;
  speed?: number;
  batteryLevel?: number;
  signalStrength?: number;
  cpuUsage?: number;
  memoryUsage?: number;
  distanceTraveled: number;
  trips:number;
  currentPosition: { x: number; y: number ; z:number} | null,

}

class RoverClient {
  private ws: WebSocket | null = null;
  private roverId: number | null = null;
  private roverIdentifier: string;
  private serverUrl: string;
  private connected = false;
  private rclNode: rclnodejs.Node | null = null;
  private sensorPublishers: Map<string, rclnodejs.Publisher<any>> = new Map();
  private commandSubscription: rclnodejs.Subscription | null = null;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastCommandId: number | null = null;
  private imageSubscription: rclnodejs.Subscription | null = null; // Subscription for camera image
  private distanceTraveled :number =0;
  private tripCount:number =0;
  private currentPosition: { x: number; y: number ;z:number } | null = null;
  private startPosition: { latitude: number; longitude: number } | null = null;
  private lastKnownPosition:{ x: number; y:number ; z :number} | null = null;

  private sensorData: SensorData = {
    temperature: 0,
    speed: 0,
    batteryLevel: 100,
    signalStrength: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    distanceTraveled: 0,
    trips: 0,
    currentPosition: { x: 0, y: 0, z: 0 },
  };
  
  constructor(serverUrl: string, roverIdentifier: string) {
    this.serverUrl = serverUrl;
    this.roverIdentifier = roverIdentifier;
  }
  
  async initialize() {
    try {
      await rclnodejs.init();

      this.rclNode = new rclnodejs.Node(rover_${this.roverIdentifier});
      
      this.setupRosPublishers();
      
      this.setupRosSubscriptions();
  
      this.rclNode.spin();
      
      console.log('ROS2 node initialized');

      this.connect();
      
    } catch (error) {
      console.error('Failed to initialize rover client:', error);
    }
  }
  
  private setupRosPublishers() {
    if (!this.rclNode) return;
    this.sensorPublishers.set('humidity', this.rclNode.createPublisher('std_msgs/msg/Float32', 'humidity'));
    this.sensorPublishers.set('pressure', this.rclNode.createPublisher('std_msgs/msg/Float32', 'pressure'));
  }
  
  private setupRosSubscriptions() {
    if (!this.rclNode) return;
    
    // Subscribe to command topic
    this.commandSubscription = this.rclNode.createSubscription(
      'std_msgs/msg/String',
      'commands',
      (msg: any) => {
        console.log('ROS command received:', msg.data);
        // Process command from ROS
      }
    );

    this.rclNode.createSubscription('sensor_msgs/msg/Temperature', '/temperature', (msg) => {
      this.sensorData.temperature = msg.temperature || 0;
    });
    
    this.rclNode.createSubscription('geometry_msgs/msg/Twist', '/rover_velocity', (msg) => {
      this.sensorData.speed = msg.linear.x || 0;
    });
    
    this.rclNode.createSubscription('sensor_msgs/msg/BatteryState', '/battery_state', (msg) => {
      this.sensorData.batteryLevel = msg.percentage * 100 || 0;
    });
    
    this.rclNode.createSubscription('std_msgs/msg/Float32', '/signal_strength', (msg) => {
      this.sensorData.signalStrength = msg.data || 0;
    });
    
    this.rclNode.createSubscription('std_msgs/msg/Float32MultiArray', '/cpu_usage', (msg :any) => {
      this.sensorData.cpuUsage = msg.data[0] || 0;
    });
    
    this.rclNode.createSubscription('std_msgs/msg/Float32', '/memory_usage', (msg) => {
      this.sensorData.memoryUsage = msg.data || 0;
    });
    
    this.rclNode.createSubscription('geometry_msgs/msg/Point', '/location_on_map', (msg) => {

      this.sensorData.currentPosition= {x:msg.x ,y:msg.y,z:msg.z};
    });
    

  }

    private connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('Already connected to server.');
      return;
    }

    this.ws = new WebSocket(this.serverUrl);
    
    this.ws.on('open', () => {
      console.log('Connected to server');
      this.connected = true;

      if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = null;
      }

      this.sendMessage({
        type: 'CONNECT',
        payload: {
          type: 'rover',
          identifier: this.roverIdentifier
        }
      });

      this.pingInterval = setInterval(() => {
        this.sendSensorData();
      }, 5000);

    });
    
    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });
    
    this.ws.on('close', () => {
      console.log('Disconnected from server');
      this.connected = false;
      this.roverId = null;

      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }

      if (!this.reconnectInterval) {
        this.reconnectInterval = setInterval(() => {
          console.log('Attempting to reconnect...');
          this.connect();
        }, 5000);
      }
    });
    
    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }
  
  private handleMessage(message: any) {
    switch (message.type) {
      case 'CONNECT':
        // Handle connection response
        if (message.payload.success) {
          console.log('Connection successful');
          this.roverId = message.payload.roverId;

          
          if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
          }
          
        }
        break;

      case 'SENSOR_DATA':
        if (message.payload.latitude && message.payload.longitude) {

        }
        break;

      case 'COMMAND':
        // Handle command request
        this.handleCommand(message);
        break;
      
      case 'ERROR':
        console.error('Server error:', message.payload);
        break;
    }
  }
  
  private handleCommand(message: any) {
    
    if (!message || !message.payload) {
      console.error('Invalid message structure:', message);
      return;
    }

    const command = message.payload.command;
    const commandId = message.payload.commandId;

    if (!command || typeof command !== 'string') {
      console.error(Invalid command received: ${command} (ID: ${commandId}));
      return;
    }

    if (this.lastCommandId !== null && this.lastCommandId === commandId) {
      console.log(Duplicate command ignored: ${command} (ID: ${commandId}));
      return;
    }
    this.lastCommandId = commandId; // Track last processed command

    console.log(Received command: ${command} (ID: ${commandId}));


  
    // Process command
    let response = '';
    let status = 'success';
    
    try {
      
      
      // Parse and execute command
      const parts = command.split(' ');
      const action = parts[0].toLowerCase();

      if (!this.rclNode) {
        console.error('ROS 2 node not initialized.');
        status = 'failed';
        response = 'ROS 2 node is not available.';

      }else{
        const publisher = this.rclNode.createPublisher('std_msgs/msg/String', 'rover_commands');
      
        switch (action) {
          case 'move':
            if (parts.length < 3) {
              throw new Error('Move command format is incorrect. Expected: move <direction> <distance>');
            }

            // Handle movement command
            const direction = parts[1];
            const distance = parseFloat(parts[2]);

            if (isNaN(distance)) {
              throw new Error('Invalid distance value for move command.');
            }

            response = Moving ${direction} ${distance} units;
            console.log(response);

        
            // Publish to ROS 2
            publisher.publish({ data: command });
            console.log(Published to ROS 2 topic: ${command});
            break;
        
          case 'stop':
            console.log('Emergency stop');
            response = 'Emergency stop engaged';
          
            // Publish to ROS2 topic
            publisher.publish({data : command});
            console.log(Published to ROS 2 topic: ${command});
            break;
                


        
          case 'camera':
            if (parts.length < 2) {
              throw new Error('Camera command format is incorrect. Expected: camera <action>');
            }

            // Handle camera command
            const cameraAction = parts[1];
            response = Camera ${cameraAction} command executed;
            console.log(response);

            break;
        
          default:
            response = Unknown command: ${action};
            status = 'failed';
            console.error(response);
        }
      }
    } catch (error) {
      console.error('Command execution error:', error);
      status = 'failed';
      response = Error executing command: ${(error as Error).message};
    }
    
    // Send response back to server
    this.sendMessage({
      type: 'COMMAND',
      roverId: this.roverId,
      payload: {
        commandId,
        status,
        response
      }
    });
  }

  private  generateSensorData():SensorData {
    return this.sensorData;
  }
  
  private sendSensorData() {
    if (!this.connected || !this.roverId){
      console.log('Skipping sensor data send: Not connected or missing rover ID');
      return;

    } 
   
    // Get sensor data
    const sensorData = this.generateSensorData();

    // Send telemetry data to server
    this.sendMessage({
      type: 'TELEMETRY',
      roverId: this.roverId,
      payload: {
        sensorData
      }
    });
    
    if(this.currentPosition){
    console.log("X:",this.currentPosition.x , "Y:", this.currentPosition.y, "Z:", this.currentPosition.z);
    }
    // Update rover status
    this.sendMessage({
      type: 'STATUS_UPDATE',
      roverId: this.roverId,
      payload: {
        status: 'active'
      }
    });
  }

  private sendMessage(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('Sending message:', message);
      this.ws.send(JSON.stringify(message));
    }
    else {
        console.log('WebSocket not open, unable to send message.');
        this.connect();
      }
  }

  async shutdown() {
    // Clear intervals
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    
    // Close WebSocket connection
    if (this.ws) {
      this.ws.terminate();
      this.ws = null;
    }
    
    // Shutdown ROS2 node
    if (this.rclNode) {
      this.rclNode.destroy();
      await rclnodejs.shutdown();
      this.rclNode = null;
    }
    
    console.log('Rover client shutdown complete');
  }
}

// Example usage
const SERVER_URL = process.env.SERVER_URL || 'ws://54.84.102.186:5000/ws';  //*'ws://172.26.220.135:5000/ws';
const ROVER_ID = process.env.ROVER_ID || 'R_002';

const roverClient = new RoverClient(SERVER_URL, ROVER_ID);
roverClient.initialize().catch(console.error);

// Handle process termination
process.on('SIGINT', async () => {
  console.log('Shutting down rover client...');
  await roverClient.shutdown();
  process.exit(0);
});