import { pool } from './_db.js';

export default async function handler(req, res) {
  try {
    // Test database connection
    const dbTest = await pool.query('SELECT 1 as test');

    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      service: "REACH 2.0 API",
      database: {
        connected: true,
        testQuery: dbTest.rows[0]
      }
    });
  } catch (error) {
    res.json({
      status: "ERROR",
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: error.message
      }
    });
  }
}

export default function handler(req, res) {
  const dbUrl = process.env.DATABASE_URL;
  
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'REACH 2.0 API',
    debug: {
      hasDatabaseURL: !!dbUrl,
      hasJWT: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV,
      databaseFormat: dbUrl ? {
        startsWithPostgresql: dbUrl.startsWith('postgresql://'),
        hasSupabaseHost: dbUrl.includes('supabase.co'),
        hasPort5432: dbUrl.includes(':5432'),
        hasPostgresDB: dbUrl.endsWith('/postgres'),
        length: dbUrl.length
      } : 'NOT_SET'
    }
  });
}
