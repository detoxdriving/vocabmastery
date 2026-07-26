import { requireSession } from './_lib/auth.js';
import { selectAll, insertRow, deleteRow } from './_lib/db.js';

export default async function handler(req, res) {
  const session = await requireSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      const rows = await selectAll('view_wrong_book',
        `user_id=eq.${session.user}&order=latest_at.desc&limit=500`);
      const dedup = {};
      (rows || []).forEach(function (r) {
        const k = r.word_id;
        if (!dedup[k] || new Date(r.latest_at) > new Date(dedup[k].latest_at)) {
          dedup[k] = r;
        }
      });
      const list = Object.values(dedup).sort(function (a, b) {
        return new Date(b.latest_at) - new Date(a.latest_at);
      });
      return res.status(200).json(list);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    const wordId = parseInt(body && body.word_id, 10);
    if (!wordId) return res.status(400).json({ error: 'word_id required' });
    try {
      const row = await insertRow('word_resolutions', {
        user_id: session.user,
        word_id: wordId,
        source: (body && body.source) || 'manual',
        source_id: (body && body.source_id) || null
      });
      return res.status(200).json(row);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}