# Database usage and schema overview

## AWS database connections
- RDS MySQL: host `rovers.cjc26ma2u8ql.us-east-1.rds.amazonaws.com` (see `server/db.ts`). Used directly by `/api/rovers` for filtered listing.
- Drizzle ORM: configured for Postgres (via `DATABASE_URL`) and MySQL schemas in `shared/schema.ts`. Currently, runtime storage is in-memory (`server/storage.ts` exports `MemStorage`), but full ORM implementations exist in `server/mysql-storage.ts` and `server/pg-storage.ts`.

## Direct SQL queries to AWS RDS (MySQL)
Endpoint: `GET /api/rovers`
- Base query: `SELECT * FROM rovers`
- Optional filters:
  - `?customer=<id>` → `WHERE customer_id = ?`
  - `?status=<value>` → `WHERE status = ?`
  - Both → `WHERE customer_id = ? AND status = ?`
- File: `server/routes.ts` (uses pool from `server/db.ts`).

## Tables referenced
From direct SQL and ORM models:
- `rovers`
- `users`
- `customers`
- `rover_customer_matrix`
- `trips`
- `sensor_data`
- `command_logs`
- `rover_clients`

## Schema (inferred from `shared/schema.ts`)

### users (Postgres)
- id: serial PK
- username: text unique not null
- password: text not null

### customers (MySQL)
- id: serial PK
- company_name: varchar(100) not null
- location: varchar(255) not null
- contact_person: varchar(100) nullable
- contact_email: varchar(100) nullable
- contact_phone: varchar(20) nullable
- created_at: timestamp default now
- updated_at: timestamp default now

### rover_customer_matrix (Postgres)
- id: serial PK
- rover_id: varchar(20) unique not null (e.g., R_001)
- rover_name: varchar(100) not null
- customer_id: integer not null
- assignment_date: timestamp default now
- is_active: boolean default true

### rovers (Postgres)
- id: serial PK
- matrix_id: integer not null
- customer_id: integer not null (FK → customers.id)
- name: text not null
- identifier: text unique not null
- connected: boolean default false
- status: text default 'disconnected'
- battery_level: integer default 100
- battery_updated_at: timestamp nullable
- last_seen: timestamp nullable
- ip_address: text nullable
- metadata: json nullable

### trips (Postgres)
- id: serial PK
- rover_id: integer not null
- start_time: timestamp default now
- end_time: timestamp nullable
- start_latitude: double precision nullable
- start_longitude: double precision nullable
- end_latitude: double precision nullable
- end_longitude: double precision nullable
- distance_traveled: double precision default 0
- avg_speed: double precision nullable
- max_speed: double precision nullable
- status: varchar(20) default 'in_progress'
- notes: text nullable

### sensor_data (Postgres)
- id: serial PK
- rover_id: integer not null
- timestamp: timestamp default now
- temperature: real nullable
- speed: real nullable
- latitude: real nullable
- longitude: real nullable
- battery_level: integer nullable
- signal_strength: integer nullable
- cpu_usage: real nullable
- memory_usage: real nullable
- distanceTraveled: real nullable
- trips: real nullable
- currentPosition: json nullable
- mapdata: json nullable

### command_logs (Postgres)
- id: serial PK
- rover_id: integer not null
- command: text not null
- timestamp: timestamp default now
- status: text default 'pending'
- response: text nullable

### rover_clients (Postgres)
- id: serial PK
- rover_id: integer not null
- connected: boolean default false
- last_ping: timestamp nullable
- socket_id: text nullable

## API to table/operation mapping

- GET `/api/roversActive`
  - Reads: `rovers` (via storage abstraction)

- GET `/api/rovers`
  - Direct SQL on AWS RDS MySQL: `SELECT * FROM rovers` with optional `customer_id` and `status` filters

- GET `/api/rovers/:id`
  - Reads: `rovers` (storage.getRover)

- GET `/api/rovers/:id/sensor-data` (limit optional)
  - Reads: `sensor_data` (storage.getSensorDataByRoverId ordered by timestamp desc)

- GET `/api/rovers/:id/command-logs` (limit optional)
  - Reads: `command_logs` (storage.getCommandLogsByRoverId ordered by timestamp desc)

- POST `/api/rovers/:id/command`
  - Writes: `command_logs` (insert pending), may update `command_logs` (failed if rover not connected)

- WebSocket message types (internal writes/updates through storage):
  - TELEMETRY → inserts into `sensor_data`, may update `rovers.battery_level`/`last_seen`
  - STATUS_UPDATE → updates `rovers.status` and `rovers.last_seen`
  - CONNECT/DISCONNECT → upserts/updates `rover_clients` and updates `rovers.connected/status`
  - COMMAND_RESPONSE → updates `command_logs.status/response`

## Notes and caveats
- The only confirmed AWS call in code is the MySQL pool to the RDS host in `server/db.ts` and the direct SQL in `/api/rovers`.
- The ORM storage classes (`server/mysql-storage.ts`, `server/pg-storage.ts`) are implemented but not wired at runtime; `MemStorage` is currently exported from `server/storage.ts`.
- To consolidate, consider routing all DB operations through a single storage implementation and removing direct SQL in `routes`.

## SQL DDL (schemas you can apply)

### MySQL (AWS RDS)
```sql
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(100) NOT NULL,
  location VARCHAR(255) NOT NULL,
  contact_person VARCHAR(100) NULL,
  contact_email VARCHAR(100) NULL,
  contact_phone VARCHAR(20) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rovers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  matrix_id INT NOT NULL,
  customer_id INT NOT NULL,
  name TEXT NOT NULL,
  identifier TEXT NOT NULL,
  connected TINYINT(1) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'disconnected',
  battery_level INT NOT NULL DEFAULT 100,
  battery_updated_at TIMESTAMP NULL,
  last_seen TIMESTAMP NULL,
  ip_address TEXT NULL,
  metadata JSON NULL,
  UNIQUE KEY uq_rovers_identifier (identifier(190)),
  INDEX idx_rovers_customer (customer_id),
  CONSTRAINT fk_rovers_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS trips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rover_id INT NOT NULL,
  start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP NULL,
  start_latitude DOUBLE NULL,
  start_longitude DOUBLE NULL,
  end_latitude DOUBLE NULL,
  end_longitude DOUBLE NULL,
  distance_traveled DOUBLE NOT NULL DEFAULT 0,
  avg_speed DOUBLE NULL,
  max_speed DOUBLE NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  notes TEXT NULL,
  INDEX idx_trips_rover (rover_id),
  CONSTRAINT fk_trips_rover FOREIGN KEY (rover_id) REFERENCES rovers(id)
);

CREATE TABLE IF NOT EXISTS sensor_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rover_id INT NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  temperature FLOAT NULL,
  speed FLOAT NULL,
  latitude FLOAT NULL,
  longitude FLOAT NULL,
  battery_level INT NULL,
  signal_strength INT NULL,
  cpu_usage FLOAT NULL,
  memory_usage FLOAT NULL,
  distanceTraveled FLOAT NULL,
  trips FLOAT NULL,
  currentPosition JSON NULL,
  mapdata JSON NULL,
  INDEX idx_sensor_rover_timestamp (rover_id, timestamp DESC),
  CONSTRAINT fk_sensor_rover FOREIGN KEY (rover_id) REFERENCES rovers(id)
);

CREATE TABLE IF NOT EXISTS command_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rover_id INT NOT NULL,
  command TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'pending',
  response TEXT NULL,
  INDEX idx_cmd_rover_timestamp (rover_id, timestamp DESC),
  CONSTRAINT fk_cmd_rover FOREIGN KEY (rover_id) REFERENCES rovers(id)
);

CREATE TABLE IF NOT EXISTS rover_clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rover_id INT NOT NULL,
  connected TINYINT(1) NOT NULL DEFAULT 0,
  last_ping TIMESTAMP NULL,
  socket_id TEXT NULL,
  INDEX idx_clients_rover (rover_id),
  CONSTRAINT fk_clients_rover FOREIGN KEY (rover_id) REFERENCES rovers(id)
);

-- Optional helper for customer-to-rover assignment if needed in MySQL
CREATE TABLE IF NOT EXISTS rover_customer_matrix (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rover_id VARCHAR(20) NOT NULL UNIQUE,
  rover_name VARCHAR(100) NOT NULL,
  customer_id INT NOT NULL,
  assignment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  INDEX idx_rcm_customer (customer_id),
  CONSTRAINT fk_rcm_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

### Postgres (for Drizzle PG storage)
```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(100) NOT NULL,
  location VARCHAR(255) NOT NULL,
  contact_person VARCHAR(100),
  contact_email VARCHAR(100),
  contact_phone VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rover_customer_matrix (
  id SERIAL PRIMARY KEY,
  rover_id VARCHAR(20) NOT NULL UNIQUE,
  rover_name VARCHAR(100) NOT NULL,
  customer_id INTEGER NOT NULL,
  assignment_date TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS rovers (
  id SERIAL PRIMARY KEY,
  matrix_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  name TEXT NOT NULL,
  identifier TEXT NOT NULL UNIQUE,
  connected BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'disconnected',
  battery_level INTEGER DEFAULT 100,
  battery_updated_at TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  ip_address TEXT,
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS trips (
  id SERIAL PRIMARY KEY,
  rover_id INTEGER NOT NULL REFERENCES rovers(id),
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  start_latitude DOUBLE PRECISION,
  start_longitude DOUBLE PRECISION,
  end_latitude DOUBLE PRECISION,
  end_longitude DOUBLE PRECISION,
  distance_traveled DOUBLE PRECISION DEFAULT 0,
  avg_speed DOUBLE PRECISION,
  max_speed DOUBLE PRECISION,
  status VARCHAR(20) DEFAULT 'in_progress',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS sensor_data (
  id SERIAL PRIMARY KEY,
  rover_id INTEGER NOT NULL REFERENCES rovers(id),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  temperature REAL,
  speed REAL,
  latitude REAL,
  longitude REAL,
  battery_level INTEGER,
  signal_strength INTEGER,
  cpu_usage REAL,
  memory_usage REAL,
  distanceTraveled REAL,
  trips REAL,
  currentPosition JSONB,
  mapdata JSONB
);

CREATE INDEX IF NOT EXISTS idx_sensor_rover_timestamp ON sensor_data (rover_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS command_logs (
  id SERIAL PRIMARY KEY,
  rover_id INTEGER NOT NULL REFERENCES rovers(id),
  command TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending',
  response TEXT
);

CREATE INDEX IF NOT EXISTS idx_cmd_rover_timestamp ON command_logs (rover_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS rover_clients (
  id SERIAL PRIMARY KEY,
  rover_id INTEGER NOT NULL REFERENCES rovers(id),
  connected BOOLEAN DEFAULT FALSE,
  last_ping TIMESTAMPTZ,
  socket_id TEXT
);
```
