import { requireSession } from '../_lib/auth.js';
import { selectAll } from '../_lib/db.js';

/**
 * /api/stats/timeline - 时间轴数据(专门用于日历/折线图)
 * query:
 *   range  - '7' | '30' | '90' | '365' | 'all'  (默认 30)
 *   stage  - 可选
 */
export default async function handler(req, res) {
  const session = await requireSession(req, res);
  if (!session) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const range = (req.query && req.query.range) || '30';
  const stageFilter = req.query && req.query.stage;
  const days = range === 'all' ? 365 : (parseInt(range, 10) || 30);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const startMs = now.getTime() - (days - 1) * 86400000;

  try {
    const [tests, quizzes, sessions] = await Promise.all([
      selectAll('tests', `user_id=eq.${session.user}&order=created_at.desc&limit=1000`),
      selectAll('quizzes', `user_id=eq.${session.user}&order=created_at.desc&limit=1000`),
      selectAll('sessions', `user_id=eq.${session.user}&order=created_at.desc&limit=1000`)
    ]);

    // 初始化每日桶
    const buckets = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startMs + i * 86400000);
      const key = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
      buckets[key] = { date: key, tests: 0, quizzes: 0, sessions: 0, score: 0, scoreCount: 0, answers: 0, correct: 0 };
    }

    function stageOf(t) {
      if (t.stage_range && typeof t.stage_range === 'string') return t.stage_range;
      if (t.results && typeof t.results === 'object') {
        if (t.results.stage) return t.results.stage;
        if (t.stage_range && t.stage_range.stage) return t.stage_range.stage;
      }
      return null;
    }

    function dateOf(iso) {
      const d = new Date(iso);
      return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
    }

    (tests || []).forEach(function (t) {
      if (!t.created_at) return;
      if (stageFilter) {
        const s = stageOf(t);
        if (s && s !== stageFilter) return;
      }
      const k = dateOf(t.created_at);
      if (!buckets[k]) return;
      buckets[k].tests++;
      if (typeof t.score === 'number') { buckets[k].score += t.score; buckets[k].scoreCount++; }
      if (Array.isArray(t.results)) {
        t.results.forEach(function (r) {
          buckets[k].answers++;
          if (r && r.correct) buckets[k].correct++;
        });
      }
    });
    (quizzes || []).forEach(function (q) {
      if (!q.created_at) return;
      const k = dateOf(q.created_at);
      if (!buckets[k]) return;
      buckets[k].quizzes++;
    });
    (sessions || []).forEach(function (s) {
      if (!s.created_at) return;
      const k = dateOf(s.created_at);
      if (!buckets[k]) return;
      buckets[k].sessions++;
      if (s.results && typeof s.results.score === 'number') { buckets[k].score += s.results.score; buckets[k].scoreCount++; }
    });

    const timeline = Object.values(buckets).sort(function (a, b) {
      return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0);
    }).map(function (b) {
      return {
        date: b.date,
        tests: b.tests,
        quizzes: b.quizzes,
        sessions: b.sessions,
        total: b.tests + b.quizzes + b.sessions,
        avgScore: b.scoreCount > 0 ? Math.round(b.score / b.scoreCount * 10) / 10 : 0,
        accuracy: b.answers > 0 ? Math.round(b.correct / b.answers * 1000) / 10 : 0,
        answers: b.answers,
        correct: b.correct
      };
    });

    // 累计指标
    let cumTests = 0, cumQuizzes = 0, cumSessions = 0, cumCorrect = 0, cumAnswers = 0;
    const cumulative = timeline.map(function (b) {
      cumTests += b.tests;
      cumQuizzes += b.quizzes;
      cumSessions += b.sessions;
      cumCorrect += b.correct;
      cumAnswers += b.answers;
      return {
        date: b.date,
        tests: cumTests,
        quizzes: cumQuizzes,
        sessions: cumSessions,
        total: cumTests + cumQuizzes + cumSessions,
        answers: cumAnswers,
        correct: cumCorrect,
        cumulativeAccuracy: cumAnswers > 0 ? Math.round(cumCorrect / cumAnswers * 1000) / 10 : 0
      };
    });

    return res.status(200).json({
      range: range,
      days: days,
      stage: stageFilter || 'all',
      timeline: timeline,
      cumulative: cumulative,
      totals: {
        tests: cumTests,
        quizzes: cumQuizzes,
        sessions: cumSessions,
        answers: cumAnswers,
        correct: cumCorrect,
        accuracy: cumAnswers > 0 ? Math.round(cumCorrect / cumAnswers * 1000) / 10 : 0
      }
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}