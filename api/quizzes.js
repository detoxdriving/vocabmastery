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
    const filter = isUuid(listId)
      ? `user_id=eq.${session.user}&list_id=eq.${listId}&order=created_at.desc&limit=100`
      : `user_id=eq.${session.user}&order=created_at.desc&limit=100`;
    try {
      const rows = await selectAll('quizzes', filter);
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
    const wrongIds = Array.isArray(body.wrong_word_ids) ? body.wrong_word_ids : [];
    const existingRounds = Array.isArray(body.rounds) ? body.rounds : [];
    const finalRounds = existingRounds.length > 0 ? existingRounds : [
      { wordIds: wrongIds, passed: wrongIds.length === 0, results: [] }
    ];
    const payload = {
      user_id: session.user,
      list_id: isUuid(listId) ? listId : null,
      started_at: body.started_at || new Date().toISOString(),
      finished_at: body.finished_at || null,
      passed_at: body.passed_at || (wrongIds.length === 0 ? new Date().toISOString() : null),
      rounds: finalRounds
    };
    try {
      const row = await insertRow('quizzes', payload);
      return res.status(200).json(row);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
