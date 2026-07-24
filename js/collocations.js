/**
 * Collocations module
 * Loads collocation data from data/collocations.json and provides
 * - Per-word lookup
 * - Stage filtering
 * - Difficulty filtering
 * - Random quiz generation (en→zh or zh→en fill-in)
 */
(function (global) {
  'use strict';

  var CACHE_KEY = 'collocations_cache';
  var CACHE_TTL = 24 * 60 * 60 * 1000;

  var _data = null;
  var _loadedAt = 0;

  async function load() {
    if (_data && (Date.now() - _loadedAt) < CACHE_TTL) return _data;
    if (global.Storage && Storage.load) {
      var cached = Storage.load(CACHE_KEY, null);
      if (cached && cached.data && (Date.now() - cached.loadedAt) < CACHE_TTL) {
        _data = cached.data;
        _loadedAt = cached.loadedAt;
        return _data;
      }
    }
    try {
      var resp = await fetch('data/collocations.json');
      if (resp.ok) {
        var arr = await resp.json();
        _data = Array.isArray(arr) ? arr : [];
        _loadedAt = Date.now();
        if (global.Storage && Storage.save) {
          Storage.save(CACHE_KEY, { data: _data, loadedAt: _loadedAt });
        }
        return _data;
      }
    } catch (e) {
      console.warn('[Collocations] load failed', e);
    }
    _data = [];
    return _data;
  }

  function getForWord(wordId) {
    if (!_data) return [];
    // Heuristic: match if any collocation's phrase contains the word (case-insensitive)
    // or if the word has a known "phrase family" stored in vocab.
    var wordText = null;
    if (global.Storage && Storage.getVocab) {
      var stages = Storage.STAGES || ['junior', 'senior', 'college', 'ielts'];
      for (var i = 0; i < stages.length; i++) {
        var v = Storage.getVocab(stages[i]);
        if (v && v.words) {
          var w = v.words.find(function (x) { return x.id === wordId; });
          if (w) { wordText = w.word; break; }
        }
      }
    }
    if (!wordText) return [];
    var lower = wordText.toLowerCase();
    return _data.filter(function (c) {
      if (!c || !c.phrase) return false;
      // Match by full word
      var tokens = c.phrase.toLowerCase().split(/\s+/);
      return tokens.indexOf(lower) >= 0;
    });
  }

  function getByStage(stage) {
    if (!_data) return [];
    return _data.filter(function (c) {
      return c && Array.isArray(c.stage) && c.stage.indexOf(stage) >= 0;
    });
  }

  function getByDifficulty(level) {
    if (!_data) return [];
    return _data.filter(function (c) { return c && c.difficulty === level; });
  }

  function getByTopic(topic) {
    if (!_data) return [];
    return _data.filter(function (c) { return c && c.topic === topic; });
  }

  /**
   * Generate a multiple-choice quiz.
   * Returns { question, options, answer, phrase, translation, explanation }.
   * @param {number} n - number of questions
   * @param {object} options - { stage, difficulty, topic, mode ('en2zh' | 'zh2en') }
   */
  function getRandomQuiz(n, options) {
    if (!_data) return [];
    options = options || {};
    var pool = _data.slice();
    if (options.stage) {
      pool = pool.filter(function (c) { return c.stage && c.stage.indexOf(options.stage) >= 0; });
    }
    if (options.difficulty != null) {
      pool = pool.filter(function (c) { return c.difficulty === options.difficulty; });
    }
    if (options.topic) {
      pool = pool.filter(function (c) { return c.topic === options.topic; });
    }
    if (pool.length === 0) return [];

    shuffle(pool);
    var count = Math.min(n || 10, pool.length);
    var chosen = pool.slice(0, count);
    var mode = options.mode || 'en2zh';

    return chosen.map(function (item) {
      // Build distractors from same pool
      var distractors = [];
      var guard = 0;
      while (distractors.length < 3 && guard < 50) {
        guard++;
        var d = pool[Math.floor(Math.random() * pool.length)];
        if (!d || d.id === item.id) continue;
        if (distractors.find(function (x) { return x.id === d.id; })) continue;
        distractors.push(d);
      }
      var options4 = distractors.concat([item]);
      shuffle(options4);

      var question, answer, explanation;
      if (mode === 'zh2en') {
        question = item.translation;
        answer = item.phrase;
        explanation = '例句:' + item.example;
      } else {
        question = item.phrase;
        answer = item.translation;
        explanation = '例句:' + item.example;
      }
      return {
        id: item.id,
        phrase: item.phrase,
        translation: item.translation,
        example: item.example,
        question: question,
        answer: answer,
        options: options4.map(function (o) {
          return mode === 'zh2en' ? o.phrase : o.translation;
        }),
        correctIndex: options4.findIndex(function (o) { return o.id === item.id; }),
        explanation: explanation,
        mode: mode
      };
    });
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function size() {
    return _data ? _data.length : 0;
  }

  // ---------- Public API ----------
  global.Collocations = {
    load: load,
    getForWord: getForWord,
    getByStage: getByStage,
    getByDifficulty: getByDifficulty,
    getByTopic: getByTopic,
    getRandomQuiz: getRandomQuiz,
    size: size
  };
})(window);
