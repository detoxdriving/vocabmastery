import { requireSession } from './_lib/auth.js';
import { selectAll } from './_lib/db.js';

/**
 * /api/stats - 后端聚合统计
 * query:
 *   range  - '7' | '30' | '90' | 'all'   (默认 30)
 *   group  - 'day' | 'week' | 'month' | 'stage' | 'mode'  (默认 day)
 *   stage  - 可选, 按 stage 过滤
 */
export default async function handler(req, res) {
  const session = await requireSession(req, res);
  if (!session) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const range = (req.query && req.query.range) || '30';
  const group = (req.query && req.query.group) || 'day';
  const stageFilter = req.query && req.query.stage;
  const now = Date.now();
  const cutoff = range === 'all' ? 0 : now - (parseInt(range, 10) || 30) * 86400000;

  try {
    const [tests, quizzes, sessions, lists, wrongItems] = await Promise.all([
      selectAll('tests', `user_id=eq.${session.user}&order=created_at.desc&limit=500`),
      selectAll('quizzes', `user_id=eq.${session.user}&order=created_at.desc&limit=500`),
      selectAll('sessions', `user_id=eq.${session.user}&order=created_at.desc&limit=500`),
      selectAll('study_lists', `user_id=eq.${session.user}&archived=eq.false&order=created_at.desc&limit=200`),
      selectAll('view_wrong_book', `user_id=eq.${session.user}&order=latest_at.desc&limit=300`)
    ]);

    // ---------- 过滤时间范围 + 可选 stage ----------
    function inRange(iso) {
      if (!iso) return false;
      const t = Date.parse(iso);
      if (isNaN(t)) return false;
      return cutoff === 0 || t >= cutoff;
    }

    function extractStage(t) {
      if (t.stage_range && typeof t.stage_range === 'string') return t.stage_range;
      if (t.results && typeof t.results === 'object') {
        if (t.results.stage) return t.results.stage;
        if (t.stage_range && t.stage_range.stage) return t.stage_range.stage;
      }
      return null;
    }

    const testsInRange = (tests || []).filter(function (t) {
      if (!inRange(t.created_at)) return false;
      if (stageFilter) {
        const s = extractStage(t);
        if (s && s !== stageFilter) return false;
      }
      return true;
    });
    const quizzesInRange = (quizzes || []).filter(function (q) {
      if (!inRange(q.created_at)) return false;
      return true;
    });
    const sessionsInRange = (sessions || []).filter(function (s) {
      if (!inRange(s.created_at)) return false;
      return true;
    });

    // ---------- 概览 ----------
    const totalTests = testsInRange.length;
    const totalQuizzes = quizzesInRange.length;
    const totalSessions = sessionsInRange.length;
    const totalLists = (lists || []).length;
    const wrongTotal = (wrongItems || []).reduce(function (s, w) { return s + (w.wrong_count || 0); }, 0);
    const wrongUnique = (wrongItems || []).length;

    let testScoreSum = 0, testScoreCount = 0;
    testsInRange.forEach(function (t) {
      if (typeof t.score === 'number') {
        testScoreSum += t.score;
        testScoreCount++;
      }
    });
    const avgTestScore = testScoreCount > 0 ? Math.round(testScoreSum / testScoreCount * 10) / 10 : 0;

    // 测验答题正确率
    let totalAnswers = 0, totalCorrect = 0;
    testsInRange.forEach(function (t) {
      if (Array.isArray(t.results)) {
        t.results.forEach(function (r) {
          totalAnswers++;
          if (r && r.correct) totalCorrect++;
        });
      }
    });
    const answerRate = totalAnswers > 0 ? Math.round(totalCorrect / totalAnswers * 1000) / 10 : 0;

    // ---------- 按 group 聚合 ----------
    const buckets = {};
    function bucketKey(iso, g) {
      const d = new Date(iso);
      if (g === 'day') {
        return d.getFullYear() + '-' +
          String(d.getMonth() + 1).padStart(2, '0') + '-' +
          String(d.getDate()).padStart(2, '0');
      }
      if (g === 'week') {
        const day = d.getDay() || 7;
        d.setDate(d.getDate() - day + 1);
        return d.getFullYear() + '-' +
          String(d.getMonth() + 1).padStart(2, '0') + '-' +
          String(d.getDate()).padStart(2, '0');
      }
      if (g === 'month') {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      }
      return 'all';
    }
    function ensureBucket(k) {
      if (!buckets[k]) buckets[k] = { tests: 0, quizzes: 0, sessions: 0, total: 0, scoreSum: 0, scoreCount: 0, answers: 0, correct: 0 };
      return buckets[k];
    }

    testsInRange.forEach(function (t) {
      const k = group === 'stage' ? (extractStage(t) || 'unknown') :
                group === 'mode' ? (t.mode || 'unknown') :
                bucketKey(t.created_at, group);
      const b = ensureBucket(k);
      b.tests++;
      b.total++;
      if (typeof t.score === 'number') { b.scoreSum += t.score; b.scoreCount++; }
      if (Array.isArray(t.results)) {
        t.results.forEach(function (r) {
          b.answers++;
          if (r && r.correct) b.correct++;
        });
      }
    });
    quizzesInRange.forEach(function (q) {
      const k = group === 'stage' ? (q.stage || 'unknown') :
                group === 'mode' ? (q.mode || 'unknown') :
                bucketKey(q.created_at, group);
      const b = ensureBucket(k);
      b.quizzes++;
      b.total++;
    });
    sessionsInRange.forEach(function (s) {
      const k = group === 'stage' ? ((s.results && s.results.stage) || 'unknown') :
                group === 'mode' ? ((s.results && s.results.mode) || 'unknown') :
                bucketKey(s.created_at, group);
      const b = ensureBucket(k);
      b.sessions++;
      b.total++;
      if (s.results && typeof s.results.score === 'number') { b.scoreSum += s.results.score; b.scoreCount++; }
    });

    const timeline = Object.keys(buckets).sort().map(function (k) {
      const b = buckets[k];
      return {
        key: k,
        tests: b.tests,
        quizzes: b.quizzes,
        sessions: b.sessions,
        total: b.total,
        avgScore: b.scoreCount > 0 ? Math.round(b.scoreSum / b.scoreCount * 10) / 10 : 0,
        accuracy: b.answers > 0 ? Math.round(b.correct / b.answers * 1000) / 10 : 0,
        answers: b.answers,
        correct: b.correct
      };
    });

    // ---------- 按 stage 聚合 ----------
    const byStage = {};
    testsInRange.forEach(function (t) {
      const s = extractStage(t) || 'unknown';
      if (!byStage[s]) byStage[s] = { tests: 0, scoreSum: 0, scoreCount: 0, answers: 0, correct: 0 };
      byStage[s].tests++;
      if (typeof t.score === 'number') { byStage[s].scoreSum += t.score; byStage[s].scoreCount++; }
      if (Array.isArray(t.results)) {
        t.results.forEach(function (r) {
          byStage[s].answers++;
          if (r && r.correct) byStage[s].correct++;
        });
      }
    });
    const stageBreakdown = Object.keys(byStage).map(function (k) {
      const b = byStage[k];
      return {
        stage: k,
        tests: b.tests,
        avgScore: b.scoreCount > 0 ? Math.round(b.scoreSum / b.scoreCount * 10) / 10 : 0,
        accuracy: b.answers > 0 ? Math.round(b.correct / b.answers * 1000) / 10 : 0,
        answers: b.answers,
        correct: b.correct
      };
    }).sort(function (a, b) { return b.tests - a.tests; });

    // ---------- 按 mode 聚合 ----------
    const byMode = {};
    testsInRange.forEach(function (t) {
      const m = t.mode || 'unknown';
      if (!byMode[m]) byMode[m] = { tests: 0, scoreSum: 0, scoreCount: 0, answers: 0, correct: 0 };
      byMode[m].tests++;
      if (typeof t.score === 'number') { byMode[m].scoreSum += t.score; byMode[m].scoreCount++; }
      if (Array.isArray(t.results)) {
        t.results.forEach(function (r) {
          byMode[m].answers++;
          if (r && r.correct) byMode[m].correct++;
        });
      }
    });
    const modeBreakdown = Object.keys(byMode).map(function (k) {
      const b = byMode[k];
      return {
        mode: k,
        tests: b.tests,
        avgScore: b.scoreCount > 0 ? Math.round(b.scoreSum / b.scoreCount * 10) / 10 : 0,
        accuracy: b.answers > 0 ? Math.round(b.correct / b.answers * 1000) / 10 : 0,
        answers: b.answers,
        correct: b.correct
      };
    }).sort(function (a, b) { return b.tests - a.tests; });

    // ---------- 错题热力 ----------
    const wrongByWord = (wrongItems || []).map(function (w) {
      return {
        word_id: w.word_id,
        source: w.source,
        source_id: w.source_id,
        latest_at: w.latest_at,
        wrong_count: w.wrong_count
      };
    });
    const wrongBySource = { quiz: 0, test: 0 };
    (wrongItems || []).forEach(function (w) {
      const key = w.source || 'test';
      wrongBySource[key] = (wrongBySource[key] || 0) + (w.wrong_count || 0);
    });

    return res.status(200).json({
      range: range,
      group: group,
      generatedAt: new Date().toISOString(),
      summary: {
        totalTests: totalTests,
        totalQuizzes: totalQuizzes,
        totalSessions: totalSessions,
        totalLists: totalLists,
        wrongTotal: wrongTotal,
        wrongUnique: wrongUnique,
        avgTestScore: avgTestScore,
        answerRate: answerRate
      },
      timeline: timeline,
      byStage: stageBreakdown,
      byMode: modeBreakdown,
      wrongBook: {
        total: wrongUnique,
        occurrences: wrongTotal,
        bySource: wrongBySource,
        topWords: wrongByWord.slice(0, 30)
      },
      lists: (lists || []).map(function (l) {
        return {
          id: l.id,
          name: l.name,
          stage: l.stage,
          wordCount: (l.word_ids || []).length,
          createdAt: l.created_at
        };
      })
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}