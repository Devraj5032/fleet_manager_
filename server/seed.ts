import 'dotenv/config';
import { createPostgresDb } from './postgres-db';
import { PostgresStorage } from './pg-storage';
import * as schema from '@shared/schema.pg';

async function run() {
  const db = createPostgresDb();
  const storage = new PostgresStorage(db);

  console.log('Seeding database...');

  // Create a couple of users
  // onConflictDoNothing optional chaining for compat across drivers
  await (db.insert(schema.users).values([
    { username: 'admin', password: 'admin' },
    { username: 'operator', password: 'operator' },
  ]) as any).onConflictDoNothing?.();

  // Create a customer
  const [customer] = await db.insert(schema.customers).values({
    companyName: 'Acme Robotics',
    location: 'NYC, USA',
    contactPerson: 'Jane Doe',
    contactEmail: 'jane@example.com',
    contactPhone: '+1-555-1234',
  }).returning();

  // Create rover assignments
  const [matrixA] = await db.insert(schema.roverCustomerMatrix).values({
    roverId: 'R_001',
    roverName: 'Rover Alpha',
    customerId: customer.id,
    isActive: true,
  }).returning();

  const [matrixB] = await db.insert(schema.roverCustomerMatrix).values({
    roverId: 'R_002',
    roverName: 'Rover Beta',
    customerId: customer.id,
    isActive: true,
  }).returning();

  // Create rovers
  const roverA = await storage.createRover({
    matrixId: matrixA.id,
    name: 'Rover Alpha',
    identifier: 'R_001',
    ipAddress: '10.0.0.11',
  });

  const roverB = await storage.createRover({
    matrixId: matrixB.id,
    name: 'Rover Beta',
    identifier: 'R_002',
    ipAddress: '10.0.0.12',
  });

  // Seed some sensor data for roverA
  await storage.createSensorData({
    roverId: roverA.id,
    temperature: 26.5,
    speed: 0.8,
    latitude: 40.7128,
    longitude: -74.0060,
    batteryLevel: 87,
    signalStrength: 4,
  });

  await storage.createSensorData({
    roverId: roverA.id,
    temperature: 27.1,
    speed: 1.2,
    latitude: 40.713,
    longitude: -74.0058,
    batteryLevel: 85,
    signalStrength: 4,
  });

  // Seed a command log for roverB
  await storage.createCommandLog({
    roverId: roverB.id,
    command: 'MOVE_FORWARD',
    status: 'pending',
    response: '',
  });

  console.log('Seed complete.');
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});


