import { pool, verifyToken } from '../_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);

    if (user.role !== 'patient') {
      return res.status(403).json({ error: 'Patient access required' });
    }

    if (req.method === 'GET') {
      // Return demo messages for now
      res.json({
        messages: [
          {
            id: '1',
            first_name: 'Cam',
            role: 'msw',
            content: 'Great job on your recent test! Keep up the excellent work.',
            created_at: new Date().toISOString()
          },
          {
            id: '2', 
            first_name: 'Zach',
            role: 'cpss',
            content: '🎉 Awesome progress! Your dedication is inspiring.',
            created_at: new Date().toISOString()
          }
        ]
      });
    } else if (req.method === 'POST') {
      const { content } = req.body;
      
      // For now, just return success
      res.json({
        messageId: 'msg-' + Date.now(),
        createdAt: new Date().toISOString(),
        message: 'Message sent successfully'
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Messages error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.status(500).json({ 
      error: 'Messages failed',
      message: error.message 
    });
  }
}
