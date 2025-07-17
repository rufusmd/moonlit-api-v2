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

        const { kit_qr_code, cpss_id, video_session_id, session_duration_minutes } = req.body;

        console.log('🧪 Submitting drug test for:', user.email);

        const testResult = await query(`
      INSERT INTO drug_tests (
        patient_id, cpss_id, kit_qr_code, video_session_id, 
        session_duration_minutes, started_at, completed_at, result, points_awarded
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'negative', 15)
      RETURNING id
    `, [user.id, cpss_id, kit_qr_code, video_session_id, session_duration_minutes]);

        const testId = testResult.rows[0].id;

        const pointsResult = await query(`
      SELECT COALESCE(SUM(points_change), 0) as current_balance
      FROM points_transactions
      WHERE patient_id = $1
    `, [user.id]);

        const newBalance = parseInt(pointsResult.rows[0].current_balance) + 15;

        await query(`
      INSERT INTO points_transactions (
        patient_id, transaction_type, points_change, balance_after, 
        drug_test_id, description
      ) VALUES ($1, 'test_completion', 15, $2, $3, 'Negative drug test completed')
    `, [user.id, newBalance, testId]);

        console.log('✅ Drug test completed, points awarded');

        res.status(200).json({
            testId,
            pointsAwarded: 15,
            newBalance,
            message: 'Test completed successfully!'
        });

    } catch (error) {
        console.error('❌ Drug test submission error:', error);
        res.status(500).json({ error: 'Failed to submit test' });
    }
}