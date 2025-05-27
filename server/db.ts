import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'rovers.cjc26ma2u8ql.us-east-1.rds.amazonaws.com',
  user: 'admin',
  password: 'password',
  database: 'rovers',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

export async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    console.log("✅ Connected to MySQL database");
    connection.release();
    return pool;
  } catch (err) {
    console.error("❌ Failed to connect to MySQL:", err);
    return null;
  }
}

export function getDatabasePool() {
  return pool;
}
