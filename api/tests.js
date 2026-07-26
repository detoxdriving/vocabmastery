import { requireSession } from './_lib/auth.js';
import { selectAll, insertRow } from './_lib/db.js';

export default async function handler(req, res) {
  const session = await requireSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const mode = req.query && req.query.mode;
    const filter = mode
      ? `user_id=eq.${session.user}&mode=eq.${encodeURIComponent(mode)}&order=created_at.desc&limit=100`
      : `user_id=eq.${session.user}&order=created_at.desc&limit=100`;
    try {
      const rows = await selectAll('tests', filter);
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
    if (!body.mode) return res.status(400).json({ error: 'mode required' });
    const stageRange = body.stage_range || body.stage || body.scope || 'all';
    const results = Array.isArray(body.results) && body.results.length > 0
      ? body.results
      : (body.wrong_word_ids || []).map(function (wid) {
          return { wordId: wid, correct: false, fromScore: true };
        });
    try {
      const row = await insertRow('tests', {
        user_id: session.user,
        stage_range: stageRange,
        mode: body.mode,
        started_at: body.started_at || new Date().toISOString(),
        finished_at: body.finished_at || null,
        score: typeof body.score === 'number' ? body.score : null,
        results: results
      });
      return res.status(200).json(row);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
