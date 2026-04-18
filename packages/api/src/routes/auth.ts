import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../services/db';
import { signToken, verifyToken } from '../middleware/auth';

const router = Router();
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, phoneNumber } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, error: 'Email and password are required' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    return;
  }

  const pool = getPool();
  if (!pool) {
    res.status(503).json({ success: false, error: 'Database unavailable' });
    return;
  }

  try {
    const [existing] = await pool.query<any[]>(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase()]
    );
    if (existing.length > 0) {
      res.status(409).json({ success: false, error: 'Email already registered' });
      return;
    }

    const id = uuidv4();
    const hash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, phone_number)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, email.toLowerCase(), hash, firstName ?? null, lastName ?? null, phoneNumber ?? null]
    );

    const token = signToken({ userId: id, email: email.toLowerCase(), role: 'user' });
    res.cookie('token', token, COOKIE_OPTS);
    res.status(201).json({
      success: true,
      data: { id, email: email.toLowerCase(), firstName, lastName, role: 'user' },
    });
  } catch (err) {
    console.error('[auth] signup error:', (err as Error).message);
    res.status(500).json({ success: false, error: 'Signup failed' });
  }
});

// POST /api/auth/signin
router.post('/signin', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, error: 'Email and password are required' });
    return;
  }

  const pool = getPool();
  if (!pool) {
    res.status(503).json({ success: false, error: 'Database unavailable' });
    return;
  }

  try {
    const [rows] = await pool.query<any[]>(
      'SELECT id, email, password_hash, first_name, last_name, role FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (rows.length === 0) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.cookie('token', token, COOKIE_OPTS);
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('[auth] signin error:', (err as Error).message);
    res.status(500).json({ success: false, error: 'Signin failed' });
  }
});

// POST /api/auth/signout
router.post('/signout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', verifyToken, (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }
  res.json({ success: true, data: req.user });
});

export default router;
