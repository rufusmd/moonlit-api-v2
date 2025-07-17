// api/_db.js - Updated for Supabase Transaction Pooler
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

// Use Transaction pooler URL (IPv4 compatible)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
}

// Create pool with Transaction pooler settings
export const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    // IMPORTANT: Transaction pooler doesn't support prepared statements
    // This is equivalent to setting prepareThreshold to 0
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test the connection
pool.on('connect', () => {
    console.log('Connected to Supabase via Transaction pooler');
});

pool.on('error', (err) => {
    console.error('Database pool error:', err);
});

// JWT helper functions
export const createToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

export const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

// Health check function
export const checkDatabaseHealth = async () => {
    try {
        const result = await pool.query('SELECT NOW() as timestamp');
        return {
            connected: true,
            timestamp: result.rows[0].timestamp,
            pooler: 'transaction'
        };
    } catch (error) {
        return {
            connected: false,
            error: error.message
        };
    }
};