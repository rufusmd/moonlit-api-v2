import { pool, createToken } from '../_db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, password } = req.body;

        console.log('🔐 Login attempt:', email);

        let result = await pool.query(
            'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0 && email === 'patient1@test.com') {
            console.log('👤 Creating demo user');

            await pool.query(`
        INSERT INTO users (email, first_name, last_name, role, medicaid_id, county, ethnicity, is_active) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, ['patient1@test.com', 'John', 'Doe', 'patient', 'MCD123456', 'Salt Lake', 'Not Hispanic or Latino', true]);

            result = await pool.query(
                'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE email = $1',
                [email]
            );
        }

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        if (!user.is_active) {
            return res.status(401).json({ error: 'Account deactivated' });
        }

        await pool.query(
            'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        const token = createToken(user);

        console.log('✅ Login successful');

        res.status(200).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            error: 'Login failed',
            message: error.message
        });
    }
}
