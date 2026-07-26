import { requireSession } from '../_lib/auth.js';
import { updateRow, deleteRow } from '../_lib/db.js';

function isUuid(s) {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export default async function handler(req, res) {
  const session = await requireSession(req, res);
  if (!session) return;

  const id = (req.query && req.query.id) || '';
  if (!isUuid(id)) return res.status(400).json({ error: 'invalid id' });

  const filter = `id=eq.${id}&user_id=eq.${session.user}`;

  if (req.method === 'PATCH') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    const patch = {};
    if (body && typeof body.name === 'string') patch.name = body.name.trim();
    if (body && typeof body.archived === 'boolean') patch.archived = body.archived;
    if (body && Array.isArray(body.word_ids)) patch.word_ids = body.word_ids;
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'nothing to update' });
    }
    try {
      const row = await updateRow('study_lists', filter, patch);
      return res.status(200).json(row);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await deleteRow('study_lists', filter);
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', 'PATCH, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}