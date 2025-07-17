import { query, verifyToken } from '../_db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const user = verifyToken(req);

        if (user.role !== 'patient') {
            return res.status(403).json({ error: 'Patient access required' });
        }

        const pointsResult = await query(`
      SELECT COALESCE(SUM(points_change), 0) as current_points
      FROM points_transactions
      WHERE patient_id = $1
    `, [user.id]);

        const activityResult = await query(`
      SELECT transaction_type, points_change, description, created_at
      FROM points_transactions
      WHERE patient_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [user.id]);

        res.status(200).json({
            pod: null,
            currentPoints: parseInt(pointsResult.rows[0].current_points),
            recentActivity: activityResult.rows
        });

    } catch (error) {
        console.error('❌ Dashboard error:', error);
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
}