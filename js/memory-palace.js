/**
 * MemoryPalace module
 * Implements the Method of Loci (记忆宫殿) for vocabulary memorization.
 * - Preset scenes (家/超市/学校/医院/公园)
 * - Create / update / delete palaces and words
 * - Recall test (按顺序复现)
 * - Visual anchor generation
 *
 * Data persisted in localStorage via Storage helpers.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'memory_palaces';

  // ---------- Preset scenes ----------
  var PRESET_SCENES = [
    {
      id: 'preset_home',
      icon: '🏠',
      name: '家记忆宫',
      scene: '家(玄关/客厅/厨房/卧室/书房)',
      description: '第一站推开门,看到玄关...走过客厅,沙发上...厨房里...卧室床头上...书桌上...',
      positions: ['玄关', '客厅', '厨房', '卧室', '书房', '阳台']
    },
    {
      id: 'preset_supermarket',
      icon: '🛒',
      name: '超市记忆宫',
      scene: '超市(入口/水果区/饮料区/零食区/收银台/出口)',
      description: '推着购物车进入超市,水果区堆满...饮料区高高的货架...零食区...收银台前...',
      positions: ['入口', '水果区', '饮料区', '零食区', '收银台', '出口']
    },
    {
      id: 'preset_school',
      icon: '🏫',
      name: '学校记忆宫',
      scene: '学校(校门/操场/教室/图书馆/食堂/办公室)',
      description: '走进校门,操场上有...教室里讲台上...图书馆书架...食堂窗口...',
      positions: ['校门', '操场', '教室', '图书馆', '食堂', '办公室']
    },
    {
      id: 'preset_hospital',
      icon: '🏥',
      name: '医院记忆宫',
      scene: '医院(大厅/挂号处/诊室/药房/病房/电梯)',
      description: '医院大厅,挂号处排着队...诊室里医生...药房窗口...病房床头...',
      positions: ['大厅', '挂号处', '诊室', '药房', '病房', '电梯']
    },
    {
      id: 'preset_park',
      icon: '🏞️',
      name: '公园记忆宫',
      scene: '公园(门口/花坛/长椅/小桥/湖边/亭子)',
      description: '从公园门口走入,花坛中...长椅上...小桥下...湖边倒影...亭子里...',
      positions: ['门口', '花坛', '长椅', '小桥', '湖边', '亭子']
    }
  ];

  // ---------- Storage ----------
  function loadAll() {
    if (global.Storage && Storage.load) {
      return Storage.load(STORAGE_KEY, []) || [];
    }
    try {
      var raw = localStorage.getItem('vm_' + STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function saveAll(list) {
    if (global.Storage && Storage.save) {
      return Storage.save(STORAGE_KEY, list);
    }
    try {
      localStorage.setItem('vm_' + STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (e) { return false; }
  }

  function genId() {
    return 'palace_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  // ---------- List / Get / Create / Update / Delete ----------
  function list() {
    return loadAll();
  }

  function get(id) {
    var all = loadAll();
    return all.find(function (p) { return p.id === id; }) || null;
  }

  function create(opts) {
    opts = opts || {};
    if (!opts.name) throw new Error('Name required');
    var all = loadAll();
    var palace = {
      id: genId(),
      name: String(opts.name).trim(),
      scene: opts.scene || '',
      description: opts.description || '',
      preset: opts.preset || null,
      positions: Array.isArray(opts.positions) ? opts.positions.slice() : [],
      words: [],
      createdAt: Date.now(),
      lastReviewed: null
    };
    all.push(palace);
    saveAll(all);
    return palace;
  }

  function update(id, updates) {
    var all = loadAll();
    var idx = all.findIndex(function (p) { return p.id === id; });
    if (idx < 0) return null;
    var allowed = ['name', 'scene', 'description', 'positions', 'lastReviewed'];
    allowed.forEach(function (k) {
      if (updates && updates[k] !== undefined) all[idx][k] = updates[k];
    });
    saveAll(all);
    return all[idx];
  }

  function remove(id) {
    var all = loadAll();
    var next = all.filter(function (p) { return p.id !== id; });
    saveAll(next);
    return all.length !== next.length;
  }

  // ---------- Add / Remove word from palace ----------
  function addWord(palaceId, wordId, position) {
    var all = loadAll();
    var p = all.find(function (x) { return x.id === palaceId; });
    if (!p) return null;
    if (!p.words) p.words = [];
    // Avoid duplicate
    var exists = p.words.find(function (w) { return w.wordId === wordId; });
    if (exists) return p;
    var word = lookupVocabWord(wordId);
    var anchor = generateAnchorImage(word, p);
    p.words.push({
      wordId: wordId,
      position: position || p.words.length + 1,
      anchor: anchor,
      addedAt: Date.now()
    });
    saveAll(all);
    return p;
  }

  function removeWord(palaceId, wordId) {
    var all = loadAll();
    var p = all.find(function (x) { return x.id === palaceId; });
    if (!p || !p.words) return null;
    p.words = p.words.filter(function (w) { return w.wordId !== wordId; });
    saveAll(all);
    return p;
  }

  // ---------- Vocab lookup helper ----------
  function lookupVocabWord(wordId) {
    if (!global.Storage) return { id: wordId, word: '#' + wordId, translation: '' };
    var stage = Storage.getCurrentStage ? Storage.getCurrentStage() : 'junior';
    var vocab = Storage.getVocab ? Storage.getVocab(stage) : null;
    if (!vocab || !vocab.words) {
      // Try all stages
      var stages = (Storage.STAGES || ['junior', 'senior', 'college', 'ielts']);
      for (var i = 0; i < stages.length; i++) {
        var v = Storage.getVocab ? Storage.getVocab(stages[i]) : null;
        if (v && v.words) {
          var found = v.words.find(function (w) { return w.id === wordId; });
          if (found) return found;
        }
      }
      return { id: wordId, word: '#' + wordId, translation: '' };
    }
    var w = vocab.words.find(function (x) { return x.id === wordId; });
    return w || { id: wordId, word: '#' + wordId, translation: '' };
  }

  // ---------- Anchor image generator ----------
  // Returns a vivid Chinese description combining scene + word meaning.
  function generateAnchorImage(word, palace) {
    if (!word) return '';
    var scene = palace && palace.scene ? palace.scene : '一个空间';
    var translation = word.translation || word.definition || word.word;
    var visual = word.image || pickEmoji(word.word);
    var w = word.word || '';
    var keyword = word.keyword || '';
    // 3 variants for variety
    var templates = [
      '在[' + scene + ']里,你看到[' + visual + '],它变形成单词"' + w + '"(意思:' + translation + '),闪着金光,正对着你微笑。',
      '想象你走进[' + scene + '],首先映入眼帘的就是一个巨大的[' + visual + '],它身上刻着英文 "' + w + '" —— ' + translation + (keyword ? ' (' + keyword + ')' : '') + '。',
      '你站在[' + scene + ']中央,[' + visual + ']从地面升起,变成发光的字母 "' + w + '"(=' + translation + '),用荒诞的动作在跳舞。'
    ];
    var idx = (w.length || 0) % templates.length;
    return templates[idx];
  }

  function pickEmoji(word) {
    if (!word) return '✨';
    var map = {
      a: '🍎', b: '🐝', c: '🐱', d: '🐶', e: '🥚', f: '🌸', g: '🍇',
      h: '🏠', i: '🍦', j: '🧃', k: '🔑', l: '🍋', m: '🌙', n: '🪺',
      o: '🍊', p: '🍐', q: '👑', r: '🤖', s: '☀️', t: '🌷', u: '☂️',
      v: '🎻', w: '💧', x: '❌', y: '🪀', z: '🦓'
    };
    var c = word.toLowerCase().charAt(0);
    return map[c] || '✨';
  }

  // ---------- Recall test ----------
  // Walks through palace.words in order. For each, calls onShowScene(item, idx, total),
  // then waits for user answer via the resolved promise.
  // callbacks: { onShowScene(item, idx, total), onAnswer(item, answer, correct), onComplete(results) }
  // Returns a controller { submit(answer), next(), end() } to be used by the UI.
  function startRecall(palaceId, callbacks) {
    callbacks = callbacks || {};
    var palace = get(palaceId);
    if (!palace) throw new Error('Palace not found: ' + palaceId);
    if (!palace.words || palace.words.length === 0) {
      throw new Error('Palace has no words to recall');
    }
    var idx = 0;
    var results = [];
    var pending = null;
    var finished = false;

    function showCurrent() {
      if (idx >= palace.words.length) {
        finished = true;
        // Update lastReviewed
        update(palaceId, { lastReviewed: Date.now() });
        if (callbacks.onComplete) {
          callbacks.onComplete({
            palaceId: palaceId,
            total: palace.words.length,
            correct: results.filter(function (r) { return r.correct; }).length,
            results: results
          });
        }
        return;
      }
      var item = palace.words[idx];
      // Hydrate with the actual word
      var w = lookupVocabWord(item.wordId);
      var hydrated = Object.assign({}, item, {
        word: w.word,
        translation: w.translation,
        phonetic: w.phonetic
      });
      if (callbacks.onShowScene) {
        callbacks.onShowScene(hydrated, idx, palace.words.length);
      }
    }

    var controller = {
      get current() {
        if (idx >= palace.words.length) return null;
        var item = palace.words[idx];
        var w = lookupVocabWord(item.wordId);
        return Object.assign({}, item, {
          word: w.word, translation: w.translation, phonetic: w.phonetic
        });
      },
      submit: function (answer) {
        if (finished) return null;
        var item = palace.words[idx];
        var w = lookupVocabWord(item.wordId);
        var correct = checkAnswer(answer, w);
        var result = {
          wordId: item.wordId,
          word: w.word,
          answer: answer,
          correct: correct,
          position: item.position
        };
        results.push(result);
        if (callbacks.onAnswer) {
          callbacks.onAnswer(item, w, answer, correct);
        }
        // Log attempt
        if (global.Storage && Storage.logAttempt) {
          Storage.logAttempt({
            stage: Storage.getCurrentStage ? Storage.getCurrentStage() : 'junior',
            wordId: item.wordId,
            mode: 'palace',
            rating: correct ? 'good' : 'again',
            correct: correct,
            timeMs: 0,
            timestamp: Date.now()
          });
        }
        idx += 1;
        return result;
      },
      next: showCurrent,
      end: function () {
        finished = true;
        if (callbacks.onComplete) {
          callbacks.onComplete({
            palaceId: palaceId,
            total: palace.words.length,
            correct: results.filter(function (r) { return r.correct; }).length,
            results: results,
            ended: true
          });
        }
      }
    };

    // Auto-advance after each submit
    var origSubmit = controller.submit;
    controller.submit = function (answer) {
      var r = origSubmit(answer);
      // Move to next scene after a short delay so UI can show feedback
      setTimeout(showCurrent, 50);
      return r;
    };

    return controller;
  }

  // Loose match: trim, lowercase, ignore punctuation
  function checkAnswer(userAnswer, word) {
    if (!userAnswer || !word) return false;
    var u = String(userAnswer).trim().toLowerCase().replace(/[.,!?;:'"]/g, '');
    var w = String(word.word || '').trim().toLowerCase();
    if (!u) return false;
    if (u === w) return true;
    // Allow 1-character typo tolerance if length >= 4
    if (w.length >= 4 && Math.abs(u.length - w.length) <= 1) {
      return levenshtein(u, w) <= 1;
    }
    return false;
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    var m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    var dp = [];
    for (var i = 0; i <= m; i++) { dp[i] = [i]; }
    for (var j = 0; j <= n; j++) { dp[0][j] = j; }
    for (var i = 1; i <= m; i++) {
      for (var j = 1; j <= n; j++) {
        var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[m][n];
  }

  // ---------- Public API ----------
  global.MemoryPalace = {
    PRESET_SCENES: PRESET_SCENES,
    list: list,
    get: get,
    create: create,
    update: update,
    delete: remove,
    addWord: addWord,
    removeWord: removeWord,
    startRecall: startRecall,
    generateAnchorImage: generateAnchorImage,
    lookupWord: lookupVocabWord
  };
})(window);
