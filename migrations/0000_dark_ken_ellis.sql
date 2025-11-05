CREATE TABLE "command_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"rover_id" integer NOT NULL,
	"command" varchar(255) NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"status" varchar(20) DEFAULT 'pending',
	"response" text,
	"user_id" integer,
	"trip_id" integer
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_name" varchar(100) NOT NULL,
	"location" varchar(255) NOT NULL,
	"contact_person" varchar(100),
	"contact_email" varchar(100),
	"contact_phone" varchar(20),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rover_clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"rover_id" integer NOT NULL,
	"connected" boolean DEFAULT false,
	"last_ping" timestamp,
	"socket_id" varchar(255),
	"connect_time" timestamp DEFAULT now(),
	"disconnect_time" timestamp
);
--> statement-breakpoint
CREATE TABLE "rover_customer_matrix" (
	"id" serial PRIMARY KEY NOT NULL,
	"rover_id" varchar(20) NOT NULL,
	"rover_name" varchar(100) NOT NULL,
	"customer_id" integer NOT NULL,
	"assignment_date" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true,
	CONSTRAINT "rover_customer_matrix_rover_id_unique" UNIQUE("rover_id")
);
--> statement-breakpoint
CREATE TABLE "rovers" (
	"id" serial PRIMARY KEY NOT NULL,
	"matrix_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"identifier" varchar(20) NOT NULL,
	"connected" boolean DEFAULT false,
	"status" varchar(20) DEFAULT 'disconnected',
	"battery_level" integer DEFAULT 100,
	"last_seen" timestamp,
	"current_latitude" double precision,
	"current_longitude" double precision,
	"current_altitude" double precision,
	"total_distance_traveled" double precision DEFAULT 0,
	"total_trips" integer DEFAULT 0,
	"ip_address" varchar(50),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "rovers_identifier_unique" UNIQUE("identifier")
);
--> statement-breakpoint
CREATE TABLE "sensor_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"rover_id" integer NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"temperature" double precision,
	"humidity" double precision,
	"pressure" double precision,
	"altitude" double precision,
	"heading" double precision,
	"speed" double precision,
	"tilt" double precision,
	"latitude" double precision,
	"longitude" double precision,
	"battery_level" integer,
	"signal_strength" integer,
	"trip_id" integer
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" serial PRIMARY KEY NOT NULL,
	"rover_id" integer NOT NULL,
	"start_time" timestamp DEFAULT now(),
	"end_time" timestamp,
	"start_latitude" double precision,
	"start_longitude" double precision,
	"end_latitude" double precision,
	"end_longitude" double precision,
	"distance_traveled" double precision DEFAULT 0,
	"avg_speed" double precision,
	"max_speed" double precision,
	"status" varchar(20) DEFAULT 'in_progress',
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(100) NOT NULL,
	"password" varchar(255) NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
