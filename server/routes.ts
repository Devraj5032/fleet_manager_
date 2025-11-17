import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { messageSchema, type WebSocketMessage } from "@shared/schema.pg";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import * as fs from 'fs';
import * as path from 'path';
import { createPostgresDb } from './postgres-db';
import * as schema from '@shared/schema.pg';
import { eq } from 'drizzle-orm';
// Using Drizzle Postgres storage; direct MySQL usage removed

// Helper function to ensure all messages have timestamp
function ensureTimestamp(message: Partial<WebSocketMessage>): WebSocketMessage {
  return {
    ...message,
    timestamp: message.timestamp || Date.now()
  } as WebSocketMessage;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time communication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Map to store client connections
  const clients = new Map<string, { 
    ws: WebSocket, 
    type: 'rover' | 'frontend',
    roverId?: number, 
    roverIdentifier: string 
  }>();
  
  // Send a message to a specific client
  function sendMessageToClient(socketId: string, message: WebSocketMessage) {
    const client = clients.get(socketId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(ensureTimestamp(message)));
      return true;
    }
    return false;
  }
  
  // Broadcast a message to all frontend clients
  function broadcastToFrontend(message: WebSocketMessage) {
    const timestampedMessage = ensureTimestamp(message);
    for (const [socketId, client] of Array.from (clients.entries())) {
      if (client.type === 'frontend' && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(timestampedMessage));
      }
    }
  }
  
  // Send a message to a specific rover
  function sendMessageToRover(roverId: number, message: WebSocketMessage): boolean {
    const timestampedMessage = ensureTimestamp(message);
    for (const [socketId, client] of Array.from(clients.entries())) {
      if (client.type === 'rover' && client.roverId === roverId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(timestampedMessage));
        return true;
      }
    }
    return false;
  }
  
  // Process rover telemetry data
  async function processTelemetry(roverId: number, payload: any, roverIdentifier: string) {
    try {
      // Extract sensor data from payload
      if (payload.sensorData) {
        const sensorDataPayload = {
          roverId,
          ...payload.sensorData
        };
        
        // Store sensor data
        await storage.createSensorData(sensorDataPayload);
        
        //* Update rover battery level if provided
        if (payload.sensorData.batteryLevel !== null) {
          await storage.updateRover(roverId, {
            batteryLevel: payload.sensorData.batteryLevel,
            lastSeen: new Date()
          });
        }
        if (payload.sensorData.currentPosition !== null) {
          
          console.log(`Current Position -> x: ${payload.sensorData.currentPosition.x}, y: ${payload.sensorData.currentPosition.y}, z: ${payload.sensorData.currentPosition.z}`);
        }
        

        
        // Broadcast to frontend clients
        broadcastToFrontend({
          type: 'TELEMETRY',
          roverIdentifier: roverIdentifier,
          roverId: roverId,
          payload: payload.sensorData,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error processing telemetry:', error);
    }
  }
  
  // Process command response
  async function processCommandResponse(roverId: number, payload: any) {
    try {
      if (!payload.commandId ||  !payload.status) {

        console.error("Invalid payload received for command response:", payload);
        return;
      }

      // Check for valid status values (pending, success, failed, etc.)
      const validStatuses = ['pending', 'success', 'failed', 'error'];
      if (!validStatuses.includes(payload.status)) {
        console.error("Invalid status value:", payload.status);
        return;
      }


      // Update command log with response
      await storage.updateCommandLog(payload.commandId, {
      status: payload.status,
      response: payload.response || 'No response'
      });

      console.log(`Updated command ${payload.commandId} with status: ${payload.status}`);

        
        // Broadcast to frontend clients
      broadcastToFrontend({
        type: 'COMMAND_RESPONSE',
        roverId,
        payload: {
          commandId: payload.commandId,
          status: payload.status,
          response: payload.response  || 'No response'
        },
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Error processing command response:', error);
    }
  }

  /*function downsampleMapData(mapData, zoom, x, y) {
    // Implement your own logic to downsample or tile the map data based on zoom and x, y position.
    // For simplicity, we're just returning a subset of the data.
  
    // Example: Slice the data to get a smaller section based on zoom and x, y position
    const chunkSize = 100; // Define how big each chunk is for each tile
    const startX = x * chunkSize;
    const startY = y * chunkSize;
  
    const downsampledData = mapData.slice(startY, startY + chunkSize).map(row => row.slice(startX, startX + chunkSize));
  
    return downsampledData;
  }*/
  
  

  // WebSocket connection handler
  wss.on('connection', (ws, req) => {
    const socketId = Math.random().toString(36).substring(2, 15);
    
    // Add client to the clients map
    clients.set(socketId, { ws, type: 'frontend' });
    
    // Send initial connection success
    ws.send(JSON.stringify(ensureTimestamp({
      type: 'CONNECT',
      payload: { success: true, socketId }
    })));
    
    // Handle messages from clients
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        const validatedMessage = messageSchema.parse(data);
        let latestMapData: MapData | null = null;


        
        switch (validatedMessage.type) {
          case 'CONNECT': {
            // Handle rover client connection
            if (validatedMessage.payload.type === 'rover' && validatedMessage.payload.identifier) {
              const roverIdentifier = validatedMessage.payload.identifier;
              
              // Find or create the rover
              let rover = await storage.getRoverByIdentifier(roverIdentifier);
              
              if (!rover) {
                // Need to create matrix entry first, then rover
                const db = createPostgresDb();
                
                // Check if matrix entry exists for this rover identifier
                let matrixEntry = await db
                  .select()
                  .from(schema.roverCustomerMatrix)
                  .where(eq(schema.roverCustomerMatrix.roverId, roverIdentifier))
                  .limit(1);
                
                let matrixId: number;
                
                if (matrixEntry.length === 0) {
                  // Matrix entry doesn't exist, create it
                  // First, get or create a default customer
                  let defaultCustomer = await db
                    .select()
                    .from(schema.customers)
                    .limit(1);
                  
                  let customerId: number;
                  
                  if (defaultCustomer.length === 0) {
                    // Create default customer
                    const [newCustomer] = await db
                      .insert(schema.customers)
                      .values({
                        companyName: 'Default Customer',
                        location: 'Unknown',
                        contactPerson: 'System',
                        contactEmail: 'system@example.com',
                        contactPhone: '',
                      })
                      .returning();
                    customerId = newCustomer.id;
                  } else {
                    customerId = defaultCustomer[0].id;
                  }
                  
                  // Create matrix entry
                  const [newMatrix] = await db
                    .insert(schema.roverCustomerMatrix)
                    .values({
                      roverId: roverIdentifier,
                      roverName: `Rover ${roverIdentifier}`,
                      customerId: customerId,
                      isActive: true,
                    })
                    .returning();
                  
                  matrixId = newMatrix.id;
                } else {
                  matrixId = matrixEntry[0].id;
                }
                
                // Now create the rover with the matrixId
                rover = await storage.createRover({
                  matrixId: matrixId,
                  name: `Rover ${roverIdentifier}`,
                  identifier: roverIdentifier,
                  ipAddress: req.socket.remoteAddress || 'unknown'
                });
              }
              
              // Update rover status to connected
              await storage.updateRover(rover.id, {
                connected: true,
                status: 'idle',
                lastSeen: new Date()
              });
              
              // Create or update rover client
              const existingClient = await storage.getRoverClientByRoverId(rover.id);
              
              if (existingClient) {
                await storage.updateRoverClient(existingClient.id, {
                  connected: true,
                  socketId,
                  lastPing: new Date()
                });
              } else {
                await storage.createRoverClient({
                  roverId: rover.id,
                  connected: true,
                  socketId
                });
              }
              
              // Update client type to rover
              clients.set(socketId, { 
                ws, 
                type: 'rover', 
                roverId: rover.id,
                roverIdentifier
              });
              
              // Send acknowledgment back to rover
              ws.send(JSON.stringify(ensureTimestamp({
                type: 'CONNECT',
                payload: { 
                  success: true,
                  socketId,
                  roverId: rover.id,
                  roverIdentifier
                }
              })));
              
              // Broadcast rover connection to frontend clients
              broadcastToFrontend({
                type: 'STATUS_UPDATE',
                roverId: rover.id,
                roverIdentifier: roverIdentifier,
                payload: {
                  status: 'idle',
                  connected: true,
                  rover
                },
                timestamp: Date.now()
              });
              
              console.log(`Rover ${roverIdentifier} connected with ID ${rover.id}`);
            }
            break;
          }
          
          case 'TELEMETRY': {
            // Handle telemetry data from rover
            const client = clients.get(socketId);
            
            if (client?.type === 'rover' && client.roverId) {
              console.log(client.roverId, validatedMessage.payload, client.roverIdentifier)
              await processTelemetry(client.roverId, validatedMessage.payload, client.roverIdentifier);
            }
            break;
            
          }
          
          case 'COMMAND': {
            // Handle command from frontend to rover
            if (validatedMessage.roverId) {
              const roverId= validatedMessage.roverId;
              const command = validatedMessage.payload.command;
              
              // Create command log
              const commandLog = await storage.createCommandLog({
                roverId,
                command,
                status: 'pending',
                response: ''
              });
              
                            
              // Send command to rover
              const sent = sendMessageToRover(roverId, {
                type: 'COMMAND',
                roverId,
                payload: {
                  command,
                  commandId: commandLog.id
                },
                timestamp: Date.now()
              });
              
              // If rover not connected, update command status
              if (!sent) {
                await storage.updateCommandLog(commandLog.id, {
                  status: 'failed',
                  response: 'Rover not connected'
                });
                
                // Send failure response back to frontend
                ws.send(JSON.stringify(ensureTimestamp({
                  type: 'COMMAND',
                  roverId,
                  payload: {
                    commandId: commandLog.id,
                    status: 'failed',
                    response: 'Rover not connected'
                  }
                })));
              }
            }
            break;
          }

          case 'COMMAND_RESPONSE': {
            // We no longer need to broadcast here, `processCommandResponse` already handles it
            const { commandId, status, response } = validatedMessage.payload;

            if (commandId) {
            // Process the command response and broadcast to frontend
              await processCommandResponse(Number(validatedMessage.roverId), validatedMessage.payload);

            }
            break;
          }
          
          
          case 'STATUS_UPDATE': {
            // Handle status updates from rovers
            const client = clients.get(socketId);
            
            if (client?.type === 'rover' && client.roverId) {
              const roverId = client.roverId;
              const status = validatedMessage.payload.status;
              
              // Update rover status
              await storage.updateRover(roverId, {
                status,
                lastSeen: new Date()
              });
              
              // Broadcast status update to frontend clients
              broadcastToFrontend({
                type: 'STATUS_UPDATE',
                roverId,
                payload: {
                  status,
                  rover: await storage.getRover(roverId)
                },
                timestamp: Date.now()
              });
            }
            break;
          }
          
          case 'MAP_DATA':{
            console.log("📡 Received MAP_DATA from Rover!");
            if (!validatedMessage.payload.mapdata) {
              console.error("❌ Map data is missing in server payload:", validatedMessage.payload);
            } else {
          
              latestMapData = {
                width: validatedMessage.payload.width,
                height: validatedMessage.payload.height,
                resolution: validatedMessage.payload.resolution,
                origin: validatedMessage.payload.origin,
                map: validatedMessage.payload.mapdata, // Compressed data
                timestamp: Date.now()
              };

            // ✅ Broadcast Map Data to Frontend
              broadcastToFrontend({
                type: "MAP_DATA",
                timestamp: Date.now(),  // ✅ Add timestamp

                payload: {
                  map: validatedMessage.payload.mapdata,  // Make sure it's mapdata
                  timestamp: Date.now()
              }
          
              });

            console.log("✅ MAP_DATA Sent to Frontend!");
            break;
            }
          }

          // ✅ Case: Request Latest Map Data
          case "REQUEST_MAP": {
            if (latestMapData) {
                ws.send(JSON.stringify({
                    type: "MAP_DATA",
                    payload: latestMapData
                }));
            }
            break;
          }


 
          
          
          case 'ERROR': {
            // Handle error messages
            console.error('Client error:', validatedMessage.payload);
            
            const client = clients.get(socketId);
            if (client?.type === 'rover' && client.roverId) {
              // Update rover status to error
              await storage.updateRover(client.roverId, {
                status: 'error',
                lastSeen: new Date()
              });
              
              // Broadcast error to frontend clients
              broadcastToFrontend({
                type: 'ERROR',
                roverId: client.roverId,
                payload: validatedMessage.payload,
                timestamp: Date.now()
              });
            }
            break;
          }
          
          
        }
      } catch (error) {
        console.error('Error processing message:', error);
        
        // Send error back to client
        if (error instanceof ZodError) {
          const validationError = fromZodError(error);
          ws.send(JSON.stringify({
            type: 'ERROR',
            payload: {
              message: 'Invalid message format',
              details: validationError.message
            }
          }));
        } else {
          ws.send(JSON.stringify({
            type: 'ERROR',
            payload: {
              message: 'Error processing message',
              details: (error as Error).message
            }
          }));
        }
      }
    });
    
    // Handle disconnection
    ws.on('close', async () => {
      const client = clients.get(socketId);
      
      if (client?.type === 'rover' && client.roverId) {
        // Update rover status to disconnected
        await storage.updateRover(client.roverId, {
          connected: false,
          status: 'disconnected',
          lastSeen: new Date()
        });
        
        // Update rover client
        const roverClient = await storage.getRoverClientBySocketId(socketId);
        if (roverClient) {
          await storage.updateRoverClient(roverClient.id, {
            connected: false
          });
        }
        
        // Broadcast disconnection to frontend clients
        broadcastToFrontend({
          type: 'DISCONNECT',
          roverId: client.roverId,
          payload: {
            roverIdentifier: client.roverIdentifier
          },
          timestamp: Date.now()
        });
        
        console.log(`Rover ${client.roverIdentifier} disconnected`);
      }
      
      // Remove client from map
      clients.delete(socketId);
    });
  });
  
  // API Routes

  // Simple DB health check
  app.get('/api/health', async (_req, res) => {
    try {
      // A lightweight check via storage (list rovers)
      await storage.getAllRovers();
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: (e as Error).message });
    }
  });
  
  // Get all rovers
  app.get('/api/roversActive', async (req, res) => {
    try {
      const rovers = await storage.getAllRovers();
      res.json(rovers);
    } catch (error) {
      console.error('API error:', error);
      res.json([]);
    }
  });

  app.get('/api/rovers', async (req, res) => {
    try {
      const customer = req.query.customer as string | undefined;
      const status = req.query.status as string | undefined;

      const rovers = await storage.getAllRovers();
      const normalizedStatus = (status || '').toLowerCase();
      const filtered = rovers.filter(r => {
        const matchCustomer = customer ? String((r as any).customerId ?? '') === String(customer) : true;
        let matchStatus = true;
        if (normalizedStatus) {
          if (normalizedStatus === 'enabled') {
            matchStatus = Boolean((r as any).connected);
          } else if (normalizedStatus === 'inactive') {
            matchStatus = String((r as any).status ?? '').toLowerCase() === 'disconnected';
          } else {
            matchStatus = String((r as any).status ?? '').toLowerCase() === normalizedStatus;
          }
        }
        return matchCustomer && matchStatus;
      });

      // map to snake_case expected by client
      const data = filtered.map((r: any) => ({
        id: r.id,
        name: r.name,
        identifier: r.identifier,
        status: r.status,
        last_seen: r.lastSeen ?? null,
        ip_address: r.ipAddress ?? null,
        metadata: r.metadata ?? {},
        created_at: r.createdAt ?? null,
        updated_at: r.updatedAt ?? null,
        customer_id: r.customerId ?? null,
      }));

      return res.json({ success: true, data });
    } catch (error) {
      console.error('API error:', error);
      return res.json({ success: true, data: [] });
    }
  });
  
  // Get specific rover
  app.get('/api/rovers/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const rover = await storage.getRover(id);
      
      if (!rover) {
        return res.status(404).json({ message: 'Rover not found' });
      }
      
      res.json(rover);
    } catch (error) {
      console.error('API error:', error);
      res.status(200).json({});
    }
  });
  
  // Get rover sensor data
  app.get('/api/rovers/:id/sensor-data', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string || '100');
      
      const rover = await storage.getRover(id);
      if (!rover) {
        return res.status(404).json({ message: 'Rover not found' });
      }
      
      const sensorData = await storage.getSensorDataByRoverId(id, limit);
      res.json(sensorData);
      

      
    } catch (error) {
      console.error('API error:', error);
      res.json([]);
    }
  });
  
  // Get rover command logs
  app.get('/api/rovers/:id/command-logs', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string || '100');
      
      const rover = await storage.getRover(id);
      if (!rover) {
        return res.status(404).json({ message: 'Rover not found' });
      }
      
      const commandLogs = await storage.getCommandLogsByRoverId(id, limit);
      res.json(commandLogs);
    } catch (error) {
      console.error('API error:', error);
      res.json([]);
    }
  });
  
  // Send command to rover
  app.post('/api/rovers/:id/command', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { command } = req.body;
      
      if (!command) {
        return res.status(400).json({ message: 'Command is required' });
      }
      
      const rover = await storage.getRover(id);
      if (!rover) {
        return res.status(404).json({ message: 'Rover not found' });
      }
      
      // Create command log
      const commandLog = await storage.createCommandLog({
        roverId: id,
        command,
        status: 'pending',
        response: ''
      });
      
      // Send command to rover
      const sent = sendMessageToRover(id, {
        type: 'COMMAND',
        roverId: id,
        payload: {
          command,
          commandId: commandLog.id
        },
        timestamp: Date.now()
      });
      
      if (!sent) {
        await storage.updateCommandLog(commandLog.id, {
          status: 'failed',
          response: 'Rover not connected'
        });
        
        return res.status(503).json({
          message: 'Rover not connected',
          commandId: commandLog.id
        });
      }
      
      res.json({
        message: 'Command sent successfully',
        commandId: commandLog.id
      });
      
    } catch (error) {
      console.error('API error:', error);
      res.status(200).json({ message: 'Command not sent (DB error)', error: (error as Error).message });
    }
  });
  
  // Get server statistics
  app.get('/api/stats', async (req, res) => {
    try {
      const db = createPostgresDb();
      const rovers = await storage.getAllRovers();
      
      // Get all rovers with their matrix data to check isActive status
      // Use leftJoin to handle cases where matrix might not exist (though it should per schema)
      const roversWithMatrix = await db
        .select({
          rover: schema.rovers,
          matrix: schema.roverCustomerMatrix,
        })
        .from(schema.rovers)
        .leftJoin(schema.roverCustomerMatrix, eq(schema.rovers.matrixId, schema.roverCustomerMatrix.id));
      
      // Count connected rovers (websocket connected)
      const connectedRovers = rovers.filter(rover => rover.connected === true);
      
      // Count enabled rovers (isActive = true in matrix table, and matrix exists)
      const enabledRovers = roversWithMatrix.filter(item => item.matrix && item.matrix.isActive === true).length;
      
      const stats = {
        //registeredRovers: rovers.length,
        enabledRovers: enabledRovers,
        activeRovers: connectedRovers.length, // Active = connected via websocket
        inactiveRovers: rovers.filter(rover => rover.status === 'inactive').length,
        errorRovers: rovers.filter(rover => rover.status === 'error').length,
        connectedRovers: connectedRovers.length,
        totalRovers: rovers.length
        //systemLogs: await storage.getSystemLogsCount(), // Count of system logs

      };
      
      res.json(stats);
    } catch (error) {
      console.error('API error:', error);
      res.json({
        activeRovers: 0,
        inactiveRovers: 0,
        errorRovers: 0,
        enabledRovers: 0,
        connectedRovers: 0,
        totalRovers: 0,
      });
    }
  });

  app.get('/api/map',(req,res)=>{
  
    const filePath =path.join(process.cwd(),'server','map_data.json');
    fs.readFile(filePath,'utf-8',(err,data)=>{
      if (err) return res.status(500).send('File Not found');
      res.json(JSON.parse(data));
    });
  });

     // Server-side API for downsampled map data
  /*app.get('/api/map-data/:id', async (req, res) => {
    try {
      const { zoom, x, y } = req.query;  // Get zoom and tile position from client request
      // Parse the rover ID from the URL params
      const id = parseInt(req.params.id);
          // Parse the limit from the query string (default to 100 if not provided)
      const limit = parseInt(req.query.limit as string || '100');

      // Check if roverId is valid
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid roverId' });
      }
  
    // Fetch rover data using the roverId
      const rover = await storage.getRover(id);
      if (!rover) {
        return res.status(404).json({ message: 'Rover not found' });
      }

    // You need to extract the map data from rover's sensor data or telemetry data
      const mapData = await storage.getSensorDataByRoverId(id,limit);

      // If no map data is found, return a 404 error
      if (!mapData) {
        return res.status(404).json({ message: 'Map data not found' });
      }
  
      // Call the downsampling function (you can implement downsampling/tiling logic here)
      const downsampledData = downsampleMapData(mapData, zoom, x, y);

      res.json(downsampledData);
    } catch (error) {
      res.status(500).json({
        message: 'Error fetching map data',
        error: error.message
      });
    }
   });*/


  return httpServer;
}
