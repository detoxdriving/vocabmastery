import { requireSession } from './_lib/auth.js';
import { selectAll, insertRow } from './_lib/db.js';

function isUuid(s) {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export default async function handler(req, res) {
  const session = await requireSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const stage = req.query && req.query.stage;
    const wordId = req.query && req.query.word_id;
    const limit = parseInt(req.query && req.query.limit, 10) || 200;
    let filter = `user_id=eq.${session.user}&order=created_at.desc&limit=${limit}`;
    if (stage) filter += `&stage=eq.${encodeURIComponent(stage)}`;
    if (wordId) filter += `&word_id=eq.${parseInt(wordId, 10)}`;
    try {
      const rows = await selectAll('attempts', filter);
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
    const rows = Array.isArray(body) ? body : (body && body.rows);
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows array required' });
    }
    const payload = rows.map(function (r) {
      return {
        user_id: session.user,
        stage: String(r.stage || ''),
        word_id: parseInt(r.word_id, 10),
        mode: String(r.mode || 'unknown'),
        correct: !!r.correct,
        time_ms: parseInt(r.time_ms || r.timeMs || 0, 10),
        list_id: isUuid(r.list_id || r.listId) ? (r.list_id || r.listId) : null,
        session_id: isUuid(r.session_id || r.sessionId) ? (r.session_id || r.sessionId) : null
      };
    }).filter(function (r) { return r.stage && r.word_id; });
    if (payload.length === 0) return res.status(400).json({ error: 'no valid rows' });
    try {
      const out = await insertRow('attempts', payload);
      return res.status(200).json(out || payload);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
