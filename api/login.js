import { createClient } from 'gramobase';
import { z } from 'zod';

let cachedDb = null;

async function getDb() {
  if (cachedDb) return cachedDb;
  const client = createClient({
    botToken: '9154215520:AAEThUfR9rOhJ0b_Fb8T8LF3P-ZLHW5mKag',
    channelId: '-1003927945419',
    global: true,
  });
  cachedDb = await client.connect();
  return cachedDb;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required bruu' });
  }

  try {
    const db = await getDb();

    const users = db.collection('users', {
      schema: z.object({
        username: z.string(),
        email: z.string().email(),
        createdAt: z.number().default(() => Date.now()),
      }),
      indexes: ['email', 'username'],
    });

    const auth = db.createAuth({
      jwtSecret: process.env.JWT_SECRET,
      jwtExpiresIn: '7d',
      bcryptRounds: 12,
    });

    const { user, token } = await auth.login(email, password);

    if (!user || !token) {
      return res.status(401).json({ error: 'Wrong email or password bruu' });
    }

    const profile = await users.findOne({ email: { $eq: email } });

    return res.status(200).json({
      ok: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        username: profile ? profile.username : user.email.split('@')[0],
      },
    });

  } catch (err) {
    console.error('login error:', err);
    if (err.message && (err.message.toLowerCase().includes('password') || err.message.toLowerCase().includes('invalid') || err.message.toLowerCase().includes('not found'))) {
      return res.status(401).json({ error: 'Wrong email or password bruu' });
    }
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
