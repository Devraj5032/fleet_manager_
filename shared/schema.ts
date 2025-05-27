import { mysqlTable } from "drizzle-orm/mysql-core";
import { pgTable, text, serial, integer, boolean, timestamp, json, real ,varchar ,doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema remains the same as provided in the template
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});


// Customer schema for companies who own rovers
export const customers = mysqlTable("customers", {
  id: serial("id").primaryKey(),
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
export const roverCustomerMatrix = pgTable("rover_customer_matrix", {
  id: serial("id").primaryKey(),
  roverId: varchar("rover_id", { length: 20 }).notNull().unique(), // e.g., R_001, R_002
  roverName: varchar("rover_name", { length: 100 }).notNull(),
  customerId: integer("customer_id").notNull(),
  assignmentDate: timestamp("assignment_date").defaultNow(),
  isActive: boolean("is_active").default(true),
});

export const insertRoverCustomerMatrixSchema = createInsertSchema(
  roverCustomerMatrix
).pick({
  roverId: true,
  roverName: true,
  customerId: true,
  isActive: true,
});


// Rover schema
export const rovers = pgTable("rovers", {
  id: serial("id").primaryKey(),
 
  matrixId: integer("matrix_id").notNull(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id),

  name: text("name").notNull(),
  identifier: text("identifier").notNull().unique(),
  connected: boolean("connected").default(false),
  status: text("status").default("disconnected"), // disconnected, idle, active, error
  batteryLevel: integer("battery_level").default(100),
  batteryUpdatedAt: timestamp("battery_updated_at"), // <-- New column
  lastSeen: timestamp("last_seen"),
  ipAddress: text("ip_address"),
  metadata: json("metadata")
});

export const insertRoverSchema = createInsertSchema(rovers).pick({
  matrixId: true,

  name: true,
  identifier: true,
  ipAddress: true,
});

// Trip data for tracking rover journeys
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  roverId: integer("rover_id").notNull(),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  startLatitude: doublePrecision("start_latitude"),
  startLongitude: doublePrecision("start_longitude"),
  endLatitude: doublePrecision("end_latitude"),
  endLongitude: doublePrecision("end_longitude"),
  distanceTraveled: doublePrecision("distance_traveled").default(0),
  avgSpeed: doublePrecision("avg_speed"),
  maxSpeed: doublePrecision("max_speed"),
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
export const sensorData = pgTable("sensor_data", {
  id: serial("id").primaryKey(),
  roverId: integer("rover_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  temperature: real("temperature"),
  //*humidity: real("humidity"),
  //*pressure: real("pressure"),
  //*altitude: real("altitude"),
  //*heading: real("heading"),
  speed: real("speed"),
  //*tilt: real("tilt"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  batteryLevel: integer("battery_level"),
  signalStrength: integer("signal_strength"),
  cpuUsage: real("cpu_usage"), // % CPU usage (e.g., 35.25)
  memoryUsage: real("memory_usage"), // % Memory usage (e.g., 65.75)
  distanceTraveled:real("distanceTraveled"),
  trips:real("trips"),
  currentPosition:json("currentPosition"),
  //x :real("x"), // 👈 Add these lines
  //y: real("y"),

  mapdata: json("mapdata"), // ✅ FIXED: Now storing `mapdata` as JSON


});

export const insertSensorDataSchema = createInsertSchema(sensorData).pick({
  roverId: true,
  temperature: true,
  //*humidity: true,
  //*pressure: true,
  //*altitude: true,
  //*heading: true,
  speed: true,
  //*tilt: true,
  latitude: true,
  longitude: true,
  batteryLevel: true,
  signalStrength: true,
  cpuUsage: true,
  memoryUsage: true,
  distanceTraveled:true,
  trips:true,
  currentPosition:true,
  mapdata:true,


});

// Command Log schema
export const commandLogs = pgTable("command_logs", {
  id: serial("id").primaryKey(),
  roverId: integer("rover_id").notNull(), //*integer to text
  command: text("command").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  status: text("status").default("pending"), // pending, success, failed
  response: text("response")
});

export const insertCommandLogSchema = createInsertSchema(commandLogs).pick({
  roverId: true,
  command: true,
  status: true,
  response: true,
});

// Rover Client schema - for socket connections
export const roverClients = pgTable("rover_clients", {
  id: serial("id").primaryKey(),
  roverId: integer("rover_id").notNull(), //*integer to text
  connected: boolean("connected").default(false),
  lastPing: timestamp("last_ping"),
  socketId: text("socket_id")
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
export type InsertRoverCustomerMatrix = z.infer<
  typeof insertRoverCustomerMatrixSchema
>;


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
    "COMMAND_RESPONSE", 
    'STATUS_UPDATE', 
    'ERROR',
    'MAP_DATA',
    'REQUEST_MAP'
  ]),
  payload: z.any(),
  timestamp: z.number().default(() => Date.now()),
  roverId: z.union([z.string(), z.number()]).optional(), // Allow both string or number for roverId

  //*roverId: z.number().optional(),
  roverIdentifier: z.string().optional(),
});

export type WebSocketMessage = z.infer<typeof messageSchema>;
