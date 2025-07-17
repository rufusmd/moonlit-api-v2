export default function handler(req, res) {
  const dbUrl = process.env.DATABASE_URL;
  
  res.status(200).json({
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
  });
}
