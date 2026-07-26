import { verifyJWT } from './jwt.js';

const COOKIE_NAME = 'vm_session';

function parseCookie(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach(function (kv) {
    const idx = kv.indexOf('=');
    if (idx < 0) return;
    const k = kv.slice(0, idx).trim();
    const v = kv.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  });
  return out;
}

export async function getSession(req) {
  const cookies = parseCookie(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const payload = await verifyJWT(token, process.env.JWT_SECRET);
  return payload;
}

export async function requireSession(req, res) {
  const session = await getSession(req);
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return session;
}

export function setSessionCookie(res, token, maxAgeSec) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`
  ];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(res) {
  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0'
  ];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}