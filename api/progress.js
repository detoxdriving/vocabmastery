import { requireSession } from './_lib/auth.js';
import { selectAll, upsertRow, updateRow, deleteRow } from './_lib/db.js';

export default async function handler(req, res) {
  const session = await requireSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const stage = req.query && req.query.stage;
    const filter = stage
      ? `user_id=eq.${session.user}&stage=eq.${encodeURIComponent(stage)}&order=updated_at.desc`
      : `user_id=eq.${session.user}&order=updated_at.desc`;
    try {
      const rows = await selectAll('word_progress', filter);
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
        ef: typeof r.ef === 'number' ? r.ef : 2.5,
        interval_days: parseInt(r.interval_days || r.interval || 0, 10),
        repetitions: parseInt(r.repetitions || 0, 10),
        due_date: r.due_date || r.dueDate || null,
        last_reviewed: r.last_reviewed || r.lastReviewed || null,
        lapses: parseInt(r.lapses || 0, 10),
        stats: r.stats || {}
      };
    }).filter(function (r) { return r.stage && r.word_id; });
    if (payload.length === 0) return res.status(400).json({ error: 'no valid rows' });
    try {
      const out = await upsertRow('word_progress', payload, 'user_id,stage,word_id');
      return res.status(200).json(out || payload);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'PATCH') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    const stage = body && body.stage;
    const wordId = body && body.word_id;
    if (!stage || !wordId) return res.status(400).json({ error: 'stage & word_id required' });
    const patch = {};
    ['ef', 'interval_days', 'interval', 'repetitions', 'due_date', 'dueDate',
     'last_reviewed', 'lastReviewed', 'lapses', 'stats'].forEach(function (k) {
      if (body[k] !== undefined) {
        if (k === 'interval') patch.interval_days = body[k];
        else if (k === 'dueDate') patch.due_date = body[k];
        else if (k === 'lastReviewed') patch.last_reviewed = body[k];
        else patch[k] = body[k];
      }
    });
    try {
      const row = await updateRow('word_progress',
        `user_id=eq.${session.user}&stage=eq.${encodeURIComponent(stage)}&word_id=eq.${wordId}`,
        patch);
      return res.status(200).json(row);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    const stage = req.query && req.query.stage;
    const wordId = req.query && req.query.word_id;
    if (!stage || !wordId) return res.status(400).json({ error: 'stage & word_id required' });
    try {
      await deleteRow('word_progress',
        `user_id=eq.${session.user}&stage=eq.${encodeURIComponent(stage)}&word_id=eq.${wordId}`);
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
