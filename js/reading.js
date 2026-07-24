/**
 * Reading module (i+1 short articles)
 * - Preset article library (loaded from data/reading.json)
 * - Stage-based recommendation
 * - Word click to look up & add to review queue
 * - Highlight target words in text
 *
 * No LLM: articles are pre-written with i+1 controlled vocabulary mix.
 */
(function (global) {
  'use strict';

  var CACHE_KEY = 'reading_cache';
  var CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

  // ---------- Article loading ----------
  var _articles = null;

  async function load() {
    if (_articles) return _articles;
    // Try Storage cache first
    if (global.Storage && Storage.load) {
      var cached = Storage.load(CACHE_KEY, null);
      if (cached && cached.articles && (Date.now() - cached.loadedAt) < CACHE_TTL) {
        _articles = cached.articles;
        return _articles;
      }
    }
    try {
      var resp = await fetch('data/reading.json');
      if (resp.ok) {
        var data = await resp.json();
        _articles = data.articles || [];
        if (global.Storage && Storage.save) {
          Storage.save(CACHE_KEY, { articles: _articles, loadedAt: Date.now() });
        }
        return _articles;
      }
    } catch (e) {
      console.warn('[Reading] load failed, using fallback', e);
    }
    _articles = FALLBACK_ARTICLES;
    return _articles;
  }

  // Hard-coded fallback in case the JSON is unreachable
  var FALLBACK_ARTICLES = [
    {
      id: 'r_fallback_1',
      title: 'A Happy Day',
      topic: 'daily-life',
      stage: ['junior'],
      difficulty: 1,
      targetWords: ['happy', 'day', 'sun', 'friend', 'play', 'home'],
      text: 'It is a happy day today. The sun is bright and the sky is blue. I go to the park with my friend. We play games on the grass. We laugh and run. Then we go home. I love this happy day.'
    }
  ];

  function list() {
    return _articles ? _articles.slice() : [];
  }

  function get(id) {
    if (!_articles) return null;
    return _articles.find(function (a) { return a.id === id; }) || null;
  }

  function getByStage(stage) {
    if (!_articles) return [];
    return _articles.filter(function (a) {
      return Array.isArray(a.stage) && a.stage.indexOf(stage) >= 0;
    });
  }

  // ---------- Word highlighting ----------
  // Returns { html, targets[], unknownWords[] }
  // - Targets: highlighted in primary color
  // - Unknown (not in current vocab): rendered as greyed-out tokens but text visible
  function highlightWords(articleText, targetWords) {
    if (!articleText) return { html: '', targets: [], unknownWords: [] };
    targetWords = (targetWords || []).map(function (w) { return String(w).toLowerCase(); });

    // Build vocab set (lowercase) for current stage
    var vocabSet = {};
    var vocabMap = {};
    if (global.Storage && Storage.getVocab) {
      var stage = Storage.getCurrentStage ? Storage.getCurrentStage() : 'junior';
      var vocab = Storage.getVocab(stage);
      if (vocab && vocab.words) {
        vocab.words.forEach(function (w) {
          if (w && w.word) {
            vocabSet[w.word.toLowerCase()] = true;
            vocabMap[w.word.toLowerCase()] = w;
          }
        });
      }
    }

    // Tokenize: keep word chars and whitespace separately
    // Strategy: regex match [\w'-]+, capture
    var tokens = articleText.split(/(\b[\w'\-]+\b)/g);

    var html = tokens.map(function (tok) {
      if (!tok) return '';
      // Whitespace or punctuation
      if (!/[a-zA-Z]/.test(tok)) {
        return escapeHtml(tok);
      }
      var lower = tok.toLowerCase();
      if (targetWords.indexOf(lower) >= 0) {
        // Target word — make it clickable
        return '<span class="reading-target" data-word="' + escapeHtml(tok) + '">' + escapeHtml(tok) + '</span>';
      }
      if (vocabSet[lower]) {
        // Known word — could highlight softly
        return '<span class="reading-known" data-word="' + escapeHtml(tok) + '">' + escapeHtml(tok) + '</span>';
      }
      // Unknown — keep plain
      return '<span class="reading-unknown">' + escapeHtml(tok) + '</span>';
    }).join('');

    return { html: html, targets: targetWords.slice(), vocabMap: vocabMap };
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ---------- Word lookup ----------
  // Returns a vocab entry or a synthesised one.
  function lookupWord(wordText) {
    if (!wordText) return null;
    var w = String(wordText).trim().toLowerCase();
    if (global.Storage && Storage.getVocab) {
      var stages = (Storage.STAGES || ['junior', 'senior', 'college', 'ielts']);
      // Prefer current stage
      var curStage = Storage.getCurrentStage ? Storage.getCurrentStage() : stages[0];
      var lookupOrder = [curStage].concat(stages.filter(function (s) { return s !== curStage; }));
      for (var i = 0; i < lookupOrder.length; i++) {
        var v = Storage.getVocab(lookupOrder[i]);
        if (v && v.words) {
          var found = v.words.find(function (x) { return x.word && x.word.toLowerCase() === w; });
          if (found) return found;
        }
      }
    }
    return { id: null, word: wordText, translation: '不在词库', definition: '点击可加入复习', pos: '' };
  }

  // Add word to "查词生词本" so it appears in the review queue
  function addToLookupLog(wordText) {
    if (!global.Storage) return null;
    var entry = {
      word: wordText,
      stage: Storage.getCurrentStage ? Storage.getCurrentStage() : 'junior',
      lookedAt: Date.now()
    };
    var log = Storage.load('lookup_log', []);
    // Avoid duplicates
    log = log.filter(function (e) { return e.word.toLowerCase() !== wordText.toLowerCase(); });
    log.push(entry);
    if (log.length > 1000) log = log.slice(-1000);
    Storage.save('lookup_log', log);
    return entry;
  }

  function getLookupLog() {
    if (!global.Storage) return [];
    return Storage.load('lookup_log', []) || [];
  }

  // ---------- Generation placeholder (no LLM) ----------
  function generate(stage, words, options) {
    // No LLM: just pick a matching article from the library, or compose a stub.
    options = options || {};
    var candidates = getByStage(stage);
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
    return {
      id: 'gen_' + Date.now(),
      title: 'Generated (Placeholder)',
      topic: 'general',
      stage: [stage],
      difficulty: 1,
      targetWords: words || [],
      text: 'This is a placeholder article. Add real articles to data/reading.json to enable i+1 reading. Words: ' + (words || []).join(', ')
    };
  }

  // ---------- Reading session controller ----------
  // callbacks: { onWordClick(wordText, wordData), onComplete(stats), onProgress(p) }
  // Returns { start, getState }
  function startReading(articleId, callbacks) {
    callbacks = callbacks || {};
    var article = get(articleId);
    if (!article) throw new Error('Article not found: ' + articleId);

    var highlighted = highlightWords(article.text, article.targetWords || []);
    var state = {
      article: article,
      highlighted: highlighted,
      clicks: [],
      startTime: Date.now()
    };

    return {
      state: state,
      recordClick: function (wordText) {
        if (!wordText) return;
        var w = lookupWord(wordText);
        state.clicks.push({ word: wordText, at: Date.now() });
        addToLookupLog(wordText);
        if (callbacks.onWordClick) callbacks.onWordClick(wordText, w);
        return w;
      },
      complete: function () {
        var stats = {
          articleId: articleId,
          durationMs: Date.now() - state.startTime,
          clicks: state.clicks.length,
          uniqueClicks: state.clicks
            .map(function (c) { return c.word.toLowerCase(); })
            .filter(function (v, i, a) { return a.indexOf(v) === i; }).length
        };
        if (global.Storage && Storage.save) {
          var hist = Storage.load('reading_history', []);
          hist.push(Object.assign({ timestamp: Date.now() }, stats));
          if (hist.length > 200) hist = hist.slice(-200);
          Storage.save('reading_history', hist);
        }
        if (callbacks.onComplete) callbacks.onComplete(stats);
        return stats;
      }
    };
  }

  function getReadingHistory() {
    if (!global.Storage) return [];
    return Storage.load('reading_history', []) || [];
  }

  // ---------- Public API ----------
  global.Reading = {
    load: load,
    list: list,
    get: get,
    getByStage: getByStage,
    generate: generate,
    startReading: startReading,
    highlightWords: highlightWords,
    lookupWord: lookupWord,
    addToLookupLog: addToLookupLog,
    getLookupLog: getLookupLog,
    getReadingHistory: getReadingHistory
  };
})(window);
