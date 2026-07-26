import { requireSession } from './_lib/auth.js';
import { selectAll, insertRow } from './_lib/db.js';

export default async function handler(req, res) {
  const session = await requireSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const archived = req.query && req.query.archived;
    const filter = archived === 'true'
      ? `user_id=eq.${session.user}&order=created_at.desc`
      : archived === 'false'
        ? `user_id=eq.${session.user}&archived=eq.false&order=created_at.desc`
        : `user_id=eq.${session.user}&order=created_at.desc`;
    try {
      const rows = await selectAll('study_lists', filter);
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
    const name = (body && body.name || '').trim();
    const stage = (body && body.stage || '').trim();
    const wordIds = Array.isArray(body && body.word_ids) ? body.word_ids : [];
    if (!name) return res.status(400).json({ error: 'name required' });
    if (!stage) return res.status(400).json({ error: 'stage required' });

    try {
      const row = await insertRow('study_lists', {
        user_id: session.user,
        name: name,
        stage: stage,
        word_ids: wordIds
      });
      return res.status(200).json(row);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}