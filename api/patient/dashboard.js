// api/patient/dashboard.js
import { pool, verifyToken } from '../_db.js';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
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

        // Get patient's pod and team info
        const podResult = await pool.query(`
      SELECT p.name as pod_name, p.cohort_start_date,
             msw.first_name as msw_first_name, msw.last_name as msw_last_name,
             cpss.first_name as cpss_first_name, cpss.last_name as cpss_last_name
      FROM pod_memberships pm
      JOIN pods p ON pm.pod_id = p.id
      JOIN users msw ON p.msw_id = msw.id
      JOIN users cpss ON p.cpss_id = cpss.id
      WHERE pm.patient_id = $1 AND pm.status = 'active'
    `, [user.id]);

        // Get current points balance
        const pointsResult = await pool.query(`
      SELECT COALESCE(SUM(points_change), 0) as current_points
      FROM points_transactions
      WHERE patient_id = $1
    `, [user.id]);

        // Get recent activity
        const activityResult = await pool.query(`
      SELECT transaction_type, points_change, description, created_at
      FROM points_transactions
      WHERE patient_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [user.id]);

        // Get test count
        const testResult = await pool.query(`
      SELECT COUNT(*) as test_count
      FROM drug_tests
      WHERE patient_id = $1 AND result = 'negative'
    `, [user.id]);

        res.json({
            pod: podResult.rows[0] || null,
            currentPoints: parseInt(pointsResult.rows[0].current_points),
            testCount: parseInt(testResult.rows[0].test_count),
            recentActivity: activityResult.rows
        });

    } catch (error) {
        console.error('Dashboard error:', error);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }

        res.status(500).json({
            error: 'Failed to load dashboard',
            message: error.message
        });
    }
}