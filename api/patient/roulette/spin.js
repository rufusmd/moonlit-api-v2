// api/patient/roulette/spin.js
import { pool, verifyToken } from '../../_db.js';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Verify authentication
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const token = authHeader.split(' ')[1];
        const user = verifyToken(token);

        if (user.role !== 'patient') {
            return res.status(403).json({ error: 'Patient access required' });
        }

        // Check current balance
        const pointsResult = await pool.query(`
      SELECT COALESCE(SUM(points_change), 0) as current_balance
      FROM points_transactions
      WHERE patient_id = $1
    `, [user.id]);

        const currentBalance = parseInt(pointsResult.rows[0].current_balance);

        if (currentBalance < 25) {
            return res.status(400).json({
                error: 'Insufficient points',
                currentBalance,
                required: 25
            });
        }

        // Determine win amount with proper probabilities
        const rand = Math.random();
        let winAmount;

        if (rand < 0.1) {
            winAmount = 30; // 10% chance
        } else if (rand < 0.2) {
            winAmount = 25; // 10% chance
        } else if (rand < 0.3) {
            winAmount = 15; // 10% chance
        } else if (rand < 0.5) {
            winAmount = 10; // 20% chance
        } else {
            winAmount = 5;  // 50% chance
        }

        // Create roulette spin record
        const spinResult = await pool.query(`
      INSERT INTO roulette_spins (patient_id, cost_in_points, win_amount_dollars)
      VALUES ($1, 25, $2)
      RETURNING id
    `, [user.id, winAmount]);

        const spinId = spinResult.rows[0].id;

        // Deduct spin cost
        const newBalance = currentBalance - 25;
        await pool.query(`
      INSERT INTO points_transactions (
        patient_id, transaction_type, points_change, balance_after,
        roulette_spin_id, description
      ) VALUES ($1, 'roulette_spin', -25, $2, $3, 'Roulette spin cost')
    `, [user.id, newBalance, spinId]);

        res.json({
            spinId,
            winAmount,
            newBalance,
            costInPoints: 25,
            message: `You won $${winAmount}!`
        });

    } catch (error) {
        console.error('Roulette spin error:', error);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }

        res.status(500).json({
            error: 'Spin failed',
            message: error.message
        });
    }
}