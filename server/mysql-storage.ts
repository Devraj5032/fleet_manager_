/**
 * MySQL storage implementation using Drizzle ORM
 */

import { eq, desc } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '@shared/schema';
import { IStorage } from './storage';
import { 
  User, InsertUser,
  Customer, InsertCustomer,
  RoverCustomerMatrix, InsertRoverCustomerMatrix,
  Rover, InsertRover,
  Trip, InsertTrip,
  SensorData, InsertSensorData,
  CommandLog, InsertCommandLog,
  RoverClient, InsertRoverClient
} from '@shared/schema';

export class MySqlStorage implements IStorage {
  private db: MySql2Database<typeof schema>;
  
  constructor(db: MySql2Database<typeof schema>) {
    this.db = db;
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const results = await this.db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return results[0];
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const results = await this.db.select().from(schema.users).where(eq(schema.users.username, username)).limit(1);
    return results[0];
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const result = await this.db.insert(schema.users).values(user);
    const resultId = Array.isArray(result) ? 
      (result[0] as any).insertId || 0 : 
      (result as any).insertId || 0;
    const id = Number(resultId);
    return { ...user, id };
  }
  
  // Customer operations
  async getCustomer(id: number): Promise<Customer | undefined> {
    const results = await this.db.select().from(schema.customers).where(eq(schema.customers.id, id)).limit(1);
    return results[0];
  }
  
  async getAllCustomers(): Promise<Customer[]> {
    return await this.db.select().from(schema.customers);
  }
  
  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const now = new Date();
    const customerWithTimestamps = { 
      ...customer, 
      createdAt: now, 
      updatedAt: now
    };
    
    const result = await this.db.insert(schema.customers).values(customerWithTimestamps);
    const resultId = Array.isArray(result) ? 
      (result[0] as any).insertId || 0 : 
      (result as any).insertId || 0;
    const id = Number(resultId);
    
    return { 
      ...customerWithTimestamps, 
      id,
      contactPerson: customerWithTimestamps.contactPerson || null,
      contactEmail: customerWithTimestamps.contactEmail || null,
      contactPhone: customerWithTimestamps.contactPhone || null
    };
  }
  
  async updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer | undefined> {
    const customerWithTimestamp = {
      ...customer,
      updatedAt: new Date()
    };
    
    await this.db.update(schema.customers)
      .set(customerWithTimestamp)
      .where(eq(schema.customers.id, id));
    
    return this.getCustomer(id);
  }
  
  // Rover-Customer Matrix operations
  async getRoverCustomerMatrix(id: number): Promise<RoverCustomerMatrix | undefined> {
    const results = await this.db.select().from(schema.roverCustomerMatrix).where(eq(schema.roverCustomerMatrix.id, id)).limit(1);
    return results[0];
  }
  
  async getRoverCustomerMatrixByRoverId(roverId: number): Promise<RoverCustomerMatrix | undefined> {
    // Convert roverId to string since it's stored as VARCHAR in the database
    const roverIdStr = roverId.toString();
    
    const results = await this.db.select()
      .from(schema.roverCustomerMatrix)
      .where(eq(schema.roverCustomerMatrix.roverId, roverIdStr))
      .limit(1);
    
    return results[0];
  }
  
  async getRoverCustomerMatrixByCustomerId(customerId: number): Promise<RoverCustomerMatrix[]> {
    return await this.db.select()
      .from(schema.roverCustomerMatrix)
      .where(eq(schema.roverCustomerMatrix.customerId, customerId));
  }
  
  async createRoverCustomerMatrix(entry: InsertRoverCustomerMatrix): Promise<RoverCustomerMatrix> {
    const now = new Date();
    const insertData = { 
      ...entry,
      isActive: entry.isActive ?? true
    };
    
    const result = await this.db.insert(schema.roverCustomerMatrix).values(insertData);
    const resultId = Array.isArray(result) ? 
      (result[0] as any).insertId || 0 : 
      (result as any).insertId || 0;
    const id = Number(resultId);
    
    return { 
      ...insertData, 
      id,
      assignmentDate: now,
      isActive: insertData.isActive ?? true
    };
  }
  
  async updateRoverCustomerMatrix(id: number, entry: Partial<RoverCustomerMatrix>): Promise<RoverCustomerMatrix | undefined> {
    await this.db.update(schema.roverCustomerMatrix)
      .set(entry)
      .where(eq(schema.roverCustomerMatrix.id, id));
    
    return this.getRoverCustomerMatrix(id);
  }
  
  // Rover operations
  async getRover(id: number): Promise<Rover | undefined> {
    const results = await this.db.select().from(schema.rovers).where(eq(schema.rovers.id, id)).limit(1);
    return results[0];
  }
  
  async getRoverByIdentifier(identifier: string): Promise<Rover | undefined> {
    const results = await this.db.select().from(schema.rovers).where(eq(schema.rovers.identifier, identifier)).limit(1);
    return results[0];
  }
  
  async getAllRovers(): Promise<Rover[]> {
    return await this.db.select().from(schema.rovers);
  }
  
  async createRover(rover: InsertRover): Promise<Rover> {
    const now = new Date();
    
    // Ensure all fields are present with proper defaults
    const roverData = {
      matrixId: rover.matrixId,
      name: rover.name,
      identifier: rover.identifier,
      ipAddress: rover.ipAddress ?? null,
      connected: false,
      status: "disconnected",
      batteryLevel: 100,
      lastSeen: now,
      currentLatitude: null,
      currentLongitude: null,
      currentAltitude: null,
      totalDistanceTraveled: 0,
      totalTrips: 0,
      metadata: {},
      createdAt: now,
      updatedAt: now
    };
    
    const result = await this.db.insert(schema.rovers).values(roverData);
    const resultId = Array.isArray(result) ? 
      (result[0] as any).insertId || 0 : 
      (result as any).insertId || 0;
    const id = Number(resultId);
    
    return { ...roverData, id };
  }
  
  async updateRover(id: number, rover: Partial<Rover>): Promise<Rover | undefined> {
    const roverWithTimestamp = {
      ...rover,
      updatedAt: new Date()
    };
    
    await this.db.update(schema.rovers)
      .set(roverWithTimestamp)
      .where(eq(schema.rovers.id, id));
    
    return this.getRover(id);
  }
  
  // Trip operations
  async getTrip(id: number): Promise<Trip | undefined> {
    const results = await this.db.select().from(schema.trips).where(eq(schema.trips.id, id)).limit(1);
    return results[0];
  }
  
  async getTripsByRoverId(roverId: number, limit = 100): Promise<Trip[]> {
    return await this.db.select()
      .from(schema.trips)
      .where(eq(schema.trips.roverId, roverId))
      .orderBy(desc(schema.trips.startTime))
      .limit(limit);
  }
  
  async createTrip(trip: InsertTrip): Promise<Trip> {
    const now = new Date();
    
    // Ensure all required fields are present with proper defaults
    const tripData = {
      roverId: trip.roverId,
      startTime: trip.startTime ?? now,
      startLatitude: trip.startLatitude ?? null,
      startLongitude: trip.startLongitude ?? null,
      status: trip.status ?? "in_progress",
      notes: trip.notes ?? null,
      endTime: null,
      endLatitude: null,
      endLongitude: null,
      distanceTraveled: 0,
      avgSpeed: null,
      maxSpeed: null
    };
    
    const result = await this.db.insert(schema.trips).values(tripData);
    const resultId = Array.isArray(result) ? 
      (result[0] as any).insertId || 0 : 
      (result as any).insertId || 0;
    const id = Number(resultId);
    
    return { ...tripData, id };
  }
  
  async updateTrip(id: number, trip: Partial<Trip>): Promise<Trip | undefined> {
    await this.db.update(schema.trips)
      .set(trip)
      .where(eq(schema.trips.id, id));
    
    return this.getTrip(id);
  }
  
  // Sensor data operations
  async getSensorData(id: number): Promise<SensorData | undefined> {
    const results = await this.db.select().from(schema.sensorData).where(eq(schema.sensorData.id, id)).limit(1);
    return results[0];
  }
  
  async getSensorDataByRoverId(roverId: number, limit = 100): Promise<SensorData[]> {
    return await this.db.select()
      .from(schema.sensorData)
      .where(eq(schema.sensorData.roverId, roverId))
      .orderBy(desc(schema.sensorData.timestamp))
      .limit(limit);
  }
  
  async getSensorDataByTripId(tripId: number, limit = 100): Promise<SensorData[]> {
    return await this.db.select()
      .from(schema.sensorData)
      .where(eq(schema.sensorData.tripId, tripId))
      .orderBy(desc(schema.sensorData.timestamp))
      .limit(limit);
  }
  
  async createSensorData(data: InsertSensorData): Promise<SensorData> {
    const now = new Date();
    
    // Ensure all fields are present with proper null defaults for optional fields
    const sensorData = {
      roverId: data.roverId,
      timestamp: data.timestamp ?? now,
      temperature: data.temperature ?? null,
      humidity: data.humidity ?? null,
      pressure: data.pressure ?? null,
      altitude: data.altitude ?? null,
      heading: data.heading ?? null,
      speed: data.speed ?? null,
      tilt: data.tilt ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      batteryLevel: data.batteryLevel ?? null,
      signalStrength: data.signalStrength ?? null,
      tripId: data.tripId ?? null
    };
    
    const result = await this.db.insert(schema.sensorData).values(sensorData);
    const resultId = Array.isArray(result) ? 
      (result[0] as any).insertId || 0 : 
      (result as any).insertId || 0;
    const id = Number(resultId);
    
    return { ...sensorData, id };
  }
  
  // Command log operations
  async getCommandLog(id: number): Promise<CommandLog | undefined> {
    const results = await this.db.select().from(schema.commandLogs).where(eq(schema.commandLogs.id, id)).limit(1);
    return results[0];
  }
  
  async getCommandLogsByRoverId(roverId: number, limit = 100): Promise<CommandLog[]> {
    return await this.db.select()
      .from(schema.commandLogs)
      .where(eq(schema.commandLogs.roverId, roverId))
      .orderBy(desc(schema.commandLogs.timestamp))
      .limit(limit);
  }
  
  async createCommandLog(log: InsertCommandLog): Promise<CommandLog> {
    const now = new Date();
    
    // Ensure all fields are present with proper defaults for optional fields
    const commandLogData = {
      roverId: log.roverId,
      command: log.command,
      timestamp: log.timestamp ?? now,
      status: log.status ?? "pending",
      response: log.response ?? null,
      userId: log.userId ?? null,
      tripId: log.tripId ?? null
    };
    
    const result = await this.db.insert(schema.commandLogs).values(commandLogData);
    const resultId = Array.isArray(result) ? 
      (result[0] as any).insertId || 0 : 
      (result as any).insertId || 0;
    const id = Number(resultId);
    
    return { ...commandLogData, id };
  }
  
  async updateCommandLog(id: number, log: Partial<CommandLog>): Promise<CommandLog | undefined> {
    await this.db.update(schema.commandLogs)
      .set(log)
      .where(eq(schema.commandLogs.id, id));
    
    return this.getCommandLog(id);
  }
  
  // Rover client operations
  async getRoverClient(id: number): Promise<RoverClient | undefined> {
    const results = await this.db.select().from(schema.roverClients).where(eq(schema.roverClients.id, id)).limit(1);
    return results[0];
  }
  
  async getRoverClientByRoverId(roverId: number): Promise<RoverClient | undefined> {
    const results = await this.db.select()
      .from(schema.roverClients)
      .where(eq(schema.roverClients.roverId, roverId))
      .limit(1);
    
    return results[0];
  }
  
  async getRoverClientBySocketId(socketId: string): Promise<RoverClient | undefined> {
    const results = await this.db.select()
      .from(schema.roverClients)
      .where(eq(schema.roverClients.socketId, socketId))
      .limit(1);
    
    return results[0];
  }
  
  async getAllRoverClients(): Promise<RoverClient[]> {
    return await this.db.select().from(schema.roverClients);
  }
  
  async createRoverClient(client: InsertRoverClient): Promise<RoverClient> {
    const now = new Date();
    
    // Ensure all required and default values are present
    const clientData = {
      roverId: client.roverId,
      connected: client.connected ?? false,
      socketId: client.socketId ?? null,
      lastPing: now,
      connectTime: now,
      disconnectTime: null
    };
    
    const result = await this.db.insert(schema.roverClients).values(clientData);
    const resultId = Array.isArray(result) ? 
      (result[0] as any).insertId || 0 : 
      (result as any).insertId || 0;
    const id = Number(resultId);
    
    return { ...clientData, id };
  }
  
  async updateRoverClient(id: number, client: Partial<RoverClient>): Promise<RoverClient | undefined> {
    await this.db.update(schema.roverClients)
      .set(client)
      .where(eq(schema.roverClients.id, id));
    
    return this.getRoverClient(id);
  }
  
  async deleteRoverClient(id: number): Promise<boolean> {
    const result = await this.db.delete(schema.roverClients)
      .where(eq(schema.roverClients.id, id));
    
    return result !== null;
  }
}