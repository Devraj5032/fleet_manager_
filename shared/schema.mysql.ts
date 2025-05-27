import { mysqlTable, varchar, int, boolean, timestamp, json, float, text } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema remains for authentication
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Customer schema for companies who own rovers
export const customers = mysqlTable("customers", {
  id: int("id").primaryKey().autoincrement(),
  companyName: varchar("company_name", { length: 100 }).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  contactPerson: varchar("contact_person", { length: 100 }),
  contactEmail: varchar("contact_email", { length: 100 }),
  contactPhone: varchar("contact_phone", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCustomerSchema = createInsertSchema(customers).pick({
  companyName: true,
  location: true,
  contactPerson: true,
  contactEmail: true,
  contactPhone: true,
});

// Matrix table to manage rover assignment to customers
export const roverCustomerMatrix = mysqlTable("rover_customer_matrix", {
  id: int("id").primaryKey().autoincrement(),
  roverId: varchar("rover_id", { length: 20 }).notNull().unique(), // e.g., R_001, R_002
  roverName: varchar("rover_name", { length: 100 }).notNull(),
  customerId: int("customer_id").notNull(),
  assignmentDate: timestamp("assignment_date").defaultNow(),
  isActive: boolean("is_active").default(true),
});

export const insertRoverCustomerMatrixSchema = createInsertSchema(roverCustomerMatrix).pick({
  roverId: true,
  roverName: true,
  customerId: true,
  isActive: true,
});

// Rover details schema (expanded from previous version)
export const rovers = mysqlTable("rovers", {
  id: int("id").primaryKey().autoincrement(),
  matrixId: int("matrix_id").notNull(), // References the roverCustomerMatrix table
  name: varchar("name", { length: 100 }).notNull(),
  identifier: varchar("identifier", { length: 20 }).notNull().unique(),
  connected: boolean("connected").default(false),
  status: varchar("status", { length: 20 }).default("disconnected"), // disconnected, idle, active, error
  batteryLevel: int("battery_level").default(100),
  lastSeen: timestamp("last_seen"),
  currentLatitude: float("current_latitude"),
  currentLongitude: float("current_longitude"),
  currentAltitude: float("current_altitude"),
  totalDistanceTraveled: float("total_distance_traveled").default(0),
  totalTrips: int("total_trips").default(0),
  ipAddress: varchar("ip_address", { length: 50 }),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertRoverSchema = createInsertSchema(rovers).pick({
  matrixId: true,
  name: true,
  identifier: true,
  ipAddress: true,
});

// Trip data for tracking rover journeys
export const trips = mysqlTable("trips", {
  id: int("id").primaryKey().autoincrement(),
  roverId: int("rover_id").notNull(),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  startLatitude: float("start_latitude"),
  startLongitude: float("start_longitude"),
  endLatitude: float("end_latitude"),
  endLongitude: float("end_longitude"),
  distanceTraveled: float("distance_traveled").default(0),
  avgSpeed: float("avg_speed"),
  maxSpeed: float("max_speed"),
  status: varchar("status", { length: 20 }).default("in_progress"), // in_progress, completed, aborted
  notes: text("notes"),
});

export const insertTripSchema = createInsertSchema(trips).pick({
  roverId: true,
  startTime: true,
  startLatitude: true,
  startLongitude: true,
  status: true,
  notes: true,
});

// Sensor Data schema
export const sensorData = mysqlTable("sensor_data", {
  id: int("id").primaryKey().autoincrement(),
  roverId: int("rover_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  temperature: float("temperature"),
  humidity: float("humidity"),
  pressure: float("pressure"),
  altitude: float("altitude"),
  heading: float("heading"),
  speed: float("speed"),
  tilt: float("tilt"),
  latitude: float("latitude"),
  longitude: float("longitude"),
  batteryLevel: int("battery_level"),
  signalStrength: int("signal_strength"),
  tripId: int("trip_id")
});

export const insertSensorDataSchema = createInsertSchema(sensorData).pick({
  roverId: true,
  timestamp: true,
  temperature: true,
  humidity: true,
  pressure: true,
  altitude: true,
  heading: true,
  speed: true,
  tilt: true,
  latitude: true,
  longitude: true,
  batteryLevel: true,
  signalStrength: true,
  tripId: true,
});

// Command Log schema
export const commandLogs = mysqlTable("command_logs", {
  id: int("id").primaryKey().autoincrement(),
  roverId: int("rover_id").notNull(),
  command: varchar("command", { length: 255 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  status: varchar("status", { length: 20 }).default("pending"), // pending, success, failed
  response: text("response"),
  userId: int("user_id"), // Who issued the command
  tripId: int("trip_id") // Optional association with a trip
});

export const insertCommandLogSchema = createInsertSchema(commandLogs).pick({
  roverId: true,
  command: true,
  timestamp: true,
  status: true,
  response: true,
  userId: true,
  tripId: true,
});

// Rover Client schema - for socket connections
export const roverClients = mysqlTable("rover_clients", {
  id: int("id").primaryKey().autoincrement(),
  roverId: int("rover_id").notNull(),
  connected: boolean("connected").default(false),
  lastPing: timestamp("last_ping"),
  socketId: varchar("socket_id", { length: 255 }),
  connectTime: timestamp("connect_time").defaultNow(),
  disconnectTime: timestamp("disconnect_time")
});

export const insertRoverClientSchema = createInsertSchema(roverClients).pick({
  roverId: true,
  connected: true,
  socketId: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type RoverCustomerMatrix = typeof roverCustomerMatrix.$inferSelect;
export type InsertRoverCustomerMatrix = z.infer<typeof insertRoverCustomerMatrixSchema>;

export type Rover = typeof rovers.$inferSelect;
export type InsertRover = z.infer<typeof insertRoverSchema>;

export type Trip = typeof trips.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;

export type SensorData = typeof sensorData.$inferSelect;
export type InsertSensorData = z.infer<typeof insertSensorDataSchema>;

export type CommandLog = typeof commandLogs.$inferSelect;
export type InsertCommandLog = z.infer<typeof insertCommandLogSchema>;

export type RoverClient = typeof roverClients.$inferSelect;
export type InsertRoverClient = z.infer<typeof insertRoverClientSchema>;

// Message types for WebSocket communication
export const messageSchema = z.object({
  type: z.enum([
    'CONNECT', 
    'DISCONNECT', 
    'COMMAND', 
    'TELEMETRY', 
    'STATUS_UPDATE', 
    'ERROR'
  ]),
  payload: z.any(),
  timestamp: z.number().default(() => Date.now()),
  roverId: z.number().optional(),
  roverIdentifier: z.string().optional(),
});

export type WebSocketMessage = z.infer<typeof messageSchema>;