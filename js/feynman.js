/**
 * Feynman module (Feynman Technique — generation effect)
 * - generateChallenge: pull N random words from current stage
 * - submitComposition: take a user-written short text + challenge words
 * - evaluateSubmission: rate coverage, correctness (lightweight), creativity
 *
 * No LLM: evaluation is heuristic (word coverage, length, repeated words,
 * basic POS sanity check). Returns 0-100 score + feedback.
 */
(function (global) {
  'use strict';

  var HISTORY_KEY = 'feynman_history';
  var DEFAULT_N = 20;
  var MIN_TARGET_LEN = 60; // < 60 chars ⇒ "very short"

  /**
   * Pick N random words from the current stage's vocabulary.
   * Returns array of {id, word, translation, ...}.
   */
  function generateChallenge(stage, n) {
    n = n || DEFAULT_N;
    if (!global.Storage) return [];
    var s = stage || (Storage.getCurrentStage ? Storage.getCurrentStage() : 'junior');
    var vocab = Storage.getVocab ? Storage.getVocab(s) : null;
    if (!vocab || !vocab.words || vocab.words.length === 0) return [];
    var pool = vocab.words.slice();
    shuffle(pool);
    return pool.slice(0, Math.min(n, pool.length));
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  /**
   * Evaluate a user submission.
   * @param {Array} words  - challenge words
   * @param {string} text  - user composition
   * Returns {
   *   coverage: { used: number, total: number, percent: number, missingWords: string[] },
   *   correctness: { score: number, errors: string[] },
   *   creativity: { score: number, length: number, uniqueWords: number, sentences: number },
   *   score: number (0-100),
   *   feedback: string[]
   * }
   */
  function evaluateSubmission(words, text) {
    words = words || [];
    text = text || '';

    var result = {
      coverage: { used: 0, total: words.length, percent: 0, missingWords: [], usedWords: [] },
      correctness: { score: 100, errors: [] },
      creativity: { score: 0, length: text.length, uniqueWords: 0, sentences: 0 },
      score: 0,
      feedback: []
    };

    // ----- Coverage -----
    var lowerText = text.toLowerCase();
    var usedWords = [];
    var missingWords = [];
    words.forEach(function (w) {
      if (!w || !w.word) return;
      // Word-boundary match (avoid matching "cat" inside "scatter")
      var re = new RegExp('\\b' + escapeRegExp(w.word.toLowerCase()) + '\\b', 'i');
      if (re.test(lowerText)) {
        usedWords.push(w.word);
      } else {
        missingWords.push(w.word);
      }
    });
    result.coverage.used = usedWords.length;
    result.coverage.usedWords = usedWords;
    result.coverage.missingWords = missingWords;
    result.coverage.percent = words.length > 0
      ? Math.round(usedWords.length / words.length * 100)
      : 0;

    // ----- Correctness (heuristic) -----
    var errors = [];
    var corrScore = 100;
    if (text.trim().length === 0) {
      errors.push('内容为空');
      corrScore = 0;
    } else {
      // No Chinese characters in composition (basic check)
      if (/[一-龥]/.test(text)) {
        errors.push('混入了中文字符');
        corrScore -= 20;
      }
      // Unbalanced quotes
      var dq = (text.match(/"/g) || []).length;
      if (dq % 2 !== 0) {
        errors.push('英文引号未配对');
        corrScore -= 5;
      }
      // Sentence start with lowercase (very basic)
      var sentences = text.split(/[.!?]+/).map(function (s) { return s.trim(); }).filter(Boolean);
      var lowercaseStart = 0;
      sentences.forEach(function (s) {
        if (/^[a-z]/.test(s)) lowercaseStart++;
      });
      if (lowercaseStart > sentences.length / 2) {
        errors.push('超过一半的句子以小写字母开头');
        corrScore -= 10;
      }
    }
    result.correctness.score = Math.max(0, corrScore);
    result.correctness.errors = errors;

    // ----- Creativity -----
    var tokens = text.toLowerCase().match(/[a-z']+/g) || [];
    var unique = {};
    tokens.forEach(function (t) { unique[t] = true; });
    result.creativity.uniqueWords = Object.keys(unique).length;
    result.creativity.sentences = sentences ? sentences.length : 0;
    // Length score (0-100): 60 chars → 30, 300 chars → 100, cap
    var lenScore = Math.min(100, Math.round(text.length / 300 * 100));
    // Diversity bonus
    var diversityScore = Math.min(100, Math.round(result.creativity.uniqueWords / 50 * 100));
    result.creativity.score = Math.round(lenScore * 0.6 + diversityScore * 0.4);

    // ----- Overall score -----
    // Coverage 50%, Correctness 25%, Creativity 25%
    var overall = Math.round(
      result.coverage.percent * 0.5 +
      result.correctness.score * 0.25 +
      result.creativity.score * 0.25
    );
    result.score = Math.max(0, Math.min(100, overall));

    // ----- Feedback -----
    var fb = [];
    if (result.coverage.percent === 0 && words.length > 0) {
      fb.push('😅 一个挑战词都没用上,试试把它们嵌入句子中。');
    } else if (result.coverage.percent < 50) {
      fb.push('📚 已使用 ' + result.coverage.used + '/' + result.coverage.total + ' 个挑战词(覆盖率 ' + result.coverage.percent + '%),继续努力!');
    } else if (result.coverage.percent < 80) {
      fb.push('👍 覆盖率 ' + result.coverage.percent + '%,不错!剩下这些词可以再尝试:' + result.coverage.missingWords.slice(0, 5).join(', '));
    } else {
      fb.push('🎉 覆盖率 ' + result.coverage.percent + '%,挑战词运用得很好!');
    }

    if (result.correctness.errors.length > 0) {
      fb.push('⚠️ 修正建议:' + result.correctness.errors.join('; '));
    } else if (text.length > 60) {
      fb.push('✅ 基础语法检查通过。');
    }

    if (text.length < MIN_TARGET_LEN) {
      fb.push('✍️ 文章较短,试试用更多细节和例子展开。');
    } else if (result.creativity.uniqueWords >= 40) {
      fb.push('🌟 用词丰富,语言多样!继续创作吧。');
    } else if (result.creativity.uniqueWords < 20 && text.length > 100) {
      fb.push('🔁 用词重复较多,试试同义替换增加多样性。');
    }

    if (result.score >= 80) {
      fb.push('🏆 总分 ' + result.score + ' 分,达到 Feynman 复述的高水平!');
    } else if (result.score >= 60) {
      fb.push('🥈 总分 ' + result.score + ' 分,继续保持。');
    } else {
      fb.push('💪 总分 ' + result.score + ' 分,加油练习,每次都会更好。');
    }

    result.feedback = fb;
    return result;
  }

  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Persist a composition submission to history.
   */
  function submitComposition(stage, words, text) {
    var evaluation = evaluateSubmission(words, text);
    if (!global.Storage) return evaluation;
    var history = Storage.load(HISTORY_KEY, []);
    history.push({
      stage: stage || (Storage.getCurrentStage ? Storage.getCurrentStage() : 'junior'),
      wordCount: (words || []).length,
      usedWords: evaluation.coverage.usedWords,
      text: text,
      score: evaluation.score,
      timestamp: Date.now()
    });
    if (history.length > 50) history = history.slice(-50);
    Storage.save(HISTORY_KEY, history);
    return evaluation;
  }

  function getHistory() {
    if (!global.Storage) return [];
    return Storage.load(HISTORY_KEY, []) || [];
  }

  // ---------- Public API ----------
  global.Feynman = {
    generateChallenge: generateChallenge,
    submitComposition: submitComposition,
    evaluateSubmission: evaluateSubmission,
    getHistory: getHistory
  };
})(window);
