import { query, verifyToken } from '../../_db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const user = verifyToken(req);

        if (user.role !== 'patient') {
            return res.status(403).json({ error: 'Patient access required' });
        }

        const pointsResult = await query(`
      SELECT COALESCE(SUM(points_change), 0) as current_balance
      FROM points_transactions
      WHERE patient_id = $1
    `, [user.id]);

        const currentBalance = parseInt(pointsResult.rows[0].current_balance);

        if (currentBalance < 25) {
            return res.status(400).json({ error: 'Insufficient points' });
        }

        const rand = Math.random();
        let winAmount;

        if (rand < 0.1) {
            winAmount = 30;
        } else if (rand < 0.2) {
            winAmount = 25;
        } else if (rand < 0.3) {
            winAmount = 15;
        } else if (rand < 0.5) {
            winAmount = 10;
        } else {
            winAmount = 5;
        }

        const spinResult = await query(`
      INSERT INTO roulette_spins (patient_id, cost_in_points, win_amount_dollars)
      VALUES ($1, 25, $2)
      RETURNING id
    `, [user.id, winAmount]);

        const spinId = spinResult.rows[0].id;

        const newBalance = currentBalance - 25;
        await query(`
      INSERT INTO points_transactions (
        patient_id, transaction_type, points_change, balance_after,
        roulette_spin_id, description
      ) VALUES ($1, 'roulette_spin', -25, $2, $3, 'Roulette spin cost')
    `, [user.id, newBalance, spinId]);

        res.status(200).json({
            spinId,
            winAmount,
            newBalance,
            message: `You won $${winAmount}!`
        });

    } catch (error) {
        console.error('❌ Roulette spin error:', error);
        res.status(500).json({ error: 'Failed to process spin' });
    }
}