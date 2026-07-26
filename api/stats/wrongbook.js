import { requireSession } from '../_lib/auth.js';
import { selectAll, insertRow } from '../_lib/db.js';

/**
 * /api/stats/wrongbook
 * GET  - 错题统计聚合(从 view_wrong_book + word_resolutions)
 *       query: stage?(可选)
 *       返回: 错词列表 + 累计已解决 + 按 stage 分布 + 热词 Top 20
 * POST - 标记单词为已解决
 *       body: { word_id, stage? }
 */
export default async function handler(req, res) {
  const session = await requireSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      const [wrongItems, resolved, tests, quizzes] = await Promise.all([
        selectAll('view_wrong_book', `user_id=eq.${session.user}&order=latest_at.desc&limit=500`),
        selectAll('word_resolutions', `user_id=eq.${session.user}&order=resolved_at.desc&limit=500`),
        selectAll('tests', `user_id=eq.${session.user}&limit=500`),
        selectAll('quizzes', `user_id=eq.${session.user}&limit=500`)
      ]);

      // 错词去重:按 word_id,保留最新
      const dedup = {};
      (wrongItems || []).forEach(function (w) {
        const k = w.word_id;
        if (!dedup[k] || (w.latest_at && dedup[k].latest_at < w.latest_at)) {
          dedup[k] = w;
        }
      });
      const items = Object.values(dedup).sort(function (a, b) {
        return (b.latest_at || 0) > (a.latest_at || 0) ? 1 : -1;
      });

      // 累计错次 + 按 source 分布
      const totalOccurrences = items.reduce(function (s, w) { return s + (w.wrong_count || 0); }, 0);
      const bySource = {};
      items.forEach(function (w) {
        const key = w.source || 'unknown';
        bySource[key] = (bySource[key] || 0) + (w.wrong_count || 0);
      });

      // 已解决数(按 user 全局)
      const resolvedIds = {};
      (resolved || []).forEach(function (r) { resolvedIds[r.word_id] = r; });
      const resolvedCount = (resolved || []).length;

      // 清空率
      const totalEncountered = items.length + resolvedCount;
      const clearRate = totalEncountered === 0 ? 0 :
        Math.round(resolvedCount / totalEncountered * 1000) / 10;

      // Top 30 易错词
      const topWords = items.slice().sort(function (a, b) {
        return (b.wrong_count || 0) - (a.wrong_count || 0);
      }).slice(0, 30).map(function (w) {
        return {
          word_id: w.word_id,
          wrong_count: w.wrong_count,
          latest_at: w.latest_at,
          source: w.source,
          source_id: w.source_id,
          isResolved: !!resolvedIds[w.word_id]
        };
      });

      return res.status(200).json({
        total: items.length,
        occurrences: totalOccurrences,
        resolvedCount: resolvedCount,
        totalEncountered: totalEncountered,
        clearRate: clearRate,
        bySource: bySource,
        items: items.map(function (w) {
          return {
            word_id: w.word_id,
            wrong_count: w.wrong_count,
            latest_at: w.latest_at,
            source: w.source,
            source_id: w.source_id,
            isResolved: !!resolvedIds[w.word_id]
          };
        }),
        topWords: topWords,
        recentResolved: (resolved || []).slice(0, 20).map(function (r) {
          return { word_id: r.word_id, resolved_at: r.resolved_at };
        }),
        totals: {
          tests: (tests || []).length,
          quizzes: (quizzes || []).length
        }
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    const wordId = body && (body.word_id || body.wordId);
    if (!wordId || typeof wordId !== 'number') {
      return res.status(400).json({ error: 'word_id required' });
    }
    try {
      const row = await insertRow('word_resolutions', {
        user_id: session.user,
        word_id: wordId,
        source: body.source || 'manual',
        source_id: body.source_id || null
      });
      return res.status(200).json(row);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}