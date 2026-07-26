import { requireSession } from './_lib/auth.js';
import { selectAll, insertRow } from './_lib/db.js';

function isUuid(s) {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export default async function handler(req, res) {
  const session = await requireSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const listId = req.query && req.query.list_id;
    if (!listId) return res.status(400).json({ error: 'list_id required' });
    if (!isUuid(listId)) return res.status(400).json({ error: 'invalid list_id' });
    try {
      const rows = await selectAll('sessions',
        `user_id=eq.${session.user}&list_id=eq.${listId}&order=created_at.desc&limit=200`);
      return res.status(200).json(rows || []);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    const listId = body && body.list_id;
    if (!isUuid(listId)) return res.status(400).json({ error: 'invalid list_id' });
    try {
      const row = await insertRow('sessions', {
        user_id: session.user,
        list_id: listId,
        started_at: body.started_at || new Date().toISOString(),
        finished_at: body.finished_at || null,
        results: Array.isArray(body.results) ? body.results : []
      });
      return res.status(200).json(row);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}