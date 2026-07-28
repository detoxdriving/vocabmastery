import { requireSession } from './_lib/auth.js';
import { selectAll, upsertRow, updateRow, deleteRow } from './_lib/db.js';

export default async function handler(req, res) {
  const session = await requireSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const stage = req.query && req.query.stage;
    const resolved = req.query && req.query.resolved;
    let filter = `user_id=eq.${session.user}&order=latest_at.desc`;
    if (stage) filter += `&stage=eq.${encodeURIComponent(stage)}`;
    if (resolved === 'true') filter += '&resolved=eq.true';
    if (resolved === 'false') filter += '&resolved=eq.false';
    try {
      const rows = await selectAll('wrong_book', filter);
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
        wrong_count: parseInt(r.wrong_count || 1, 10),
        latest_at: r.latest_at || new Date().toISOString(),
        resolved: !!r.resolved,
        source: r.source || 'manual'
      };
    }).filter(function (r) { return r.stage && r.word_id; });
    if (payload.length === 0) return res.status(400).json({ error: 'no valid rows' });
    try {
      const out = await upsertRow('wrong_book', payload, 'user_id,stage,word_id');
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
    if (body.resolved !== undefined) patch.resolved = !!body.resolved;
    if (body.wrong_count !== undefined) patch.wrong_count = parseInt(body.wrong_count, 10);
    if (body.latest_at !== undefined) patch.latest_at = body.latest_at;
    if (body.source !== undefined) patch.source = body.source;
    try {
      const row = await updateRow('wrong_book',
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
      await deleteRow('wrong_book',
        `user_id=eq.${session.user}&stage=eq.${encodeURIComponent(stage)}&word_id=eq.${wordId}`);
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
