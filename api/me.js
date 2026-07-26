import { getSession } from './_lib/auth.js';

export default async function handler(req, res) {
  const session = await getSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return res.status(200).json({ user: session.user, exp: session.exp });
}