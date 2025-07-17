// api/patient/drug-test/submit.js
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

    const { kit_qr_code, cpss_id, video_session_id, session_duration_minutes } = req.body;

    // Create drug test record
    const testResult = await pool.query(`
      INSERT INTO drug_tests (
        patient_id, cpss_id, kit_qr_code, video_session_id, 
        session_duration_minutes, started_at, completed_at, result, points_awarded
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'negative', 15)
      RETURNING id
    `, [user.id, cpss_id, kit_qr_code, video_session_id, session_duration_minutes]);

    const testId = testResult.rows[0].id;

    // Get current points balance
    const pointsResult = await pool.query(`
      SELECT COALESCE(SUM(points_change), 0) as current_balance
      FROM points_transactions
      WHERE patient_id = $1
    `, [user.id]);

    const newBalance = parseInt(pointsResult.rows[0].current_balance) + 15;

    // Award points for negative test
    await pool.query(`
      INSERT INTO points_transactions (
        patient_id, transaction_type, points_change, balance_after, 
        drug_test_id, description
      ) VALUES ($1, 'test_completion', 15, $2, $3, 'Negative drug test completed')
    `, [user.id, newBalance, testId]);

    res.json({
      testId,
      pointsAwarded: 15,
      newBalance,
      result: 'negative',
      message: 'Test completed successfully!'
    });

  } catch (error) {
    console.error('Drug test submission error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.status(500).json({
      error: 'Test submission failed',
      message: error.message
    });
  }
}