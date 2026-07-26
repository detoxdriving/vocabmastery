import { signJWT } from './_lib/jwt.js';
import { setSessionCookie } from './_lib/auth.js';

const SESSION_DAYS = 30;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const password = body && body.password;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password required' });
  }

  const correct = process.env.APP_PASSWORD;
  if (!correct) {
    return res.status(500).json({ error: 'APP_PASSWORD not configured' });
  }

  if (password !== correct) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const maxAgeSec = SESSION_DAYS * 24 * 60 * 60;
  const exp = Date.now() + maxAgeSec * 1000;
  const token = await signJWT({ user: 'primary', exp }, process.env.JWT_SECRET);
  setSessionCookie(res, token, maxAgeSec);

  return res.status(200).json({ ok: true, user: 'primary' });
}