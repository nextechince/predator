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

  const { username, email, password } = req.body || {};

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Fill all fields bruu' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password too short (min 6)' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
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

    const existingEmail = await users.findOne({ email: { $eq: email } });
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const existingUser = await users.findOne({ username: { $eq: username } });
    if (existingUser) {
      return res.status(409).json({ error: 'Username taken' });
    }

    const auth = db.createAuth({
      jwtSecret: process.env.JWT_SECRET,
      jwtExpiresIn: '7d',
      bcryptRounds: 12,
    });

    const { user } = await auth.register(email, password, ['user']);

    await users.insertOne({
      username,
      email,
      createdAt: Date.now(),
    });

    return res.status(201).json({
      ok: true,
      message: 'Account created',
      userId: user._id,
    });

  } catch (err) {
    console.error('signup error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
