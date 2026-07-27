/**
 * Storage module: encapsulates localStorage read/write for VocabMastery.
 * Provides vocabulary loading, SRS progress tracking, statistics, and import/export.
 */
(function (global) {
  'use strict';

  var KEY_PREFIX = 'vm_';
  // Stage identifiers align with data/<stage>.json file naming.
  var STAGES = [
    'chuyi-shang', 'chuyi-xia',
    'chuer-shang', 'chuer-xia',
    'chusan-shang', 'chusan-xia',
    'chuzhong-supplement',
    'gaoyi-shang', 'gaoyi-xia',
    'gaoer-shang', 'gaoer-xia',
    'gaosan-shang', 'gaosan-xia',
    'college', 'ielts'
  ];
  var STAGE_NAMES = {
    'chuyi-shang': '初一上学期',
    'chuyi-xia':   '初一下学期',
    'chuer-shang': '初二上学期',
    'chuer-xia':   '初二下学期',
    'chusan-shang':'初三上学期',
    'chusan-xia':  '初三下学期',
    'chuzhong-supplement': '初中补充包',
    'gaoyi-shang': '高一上学期',
    'gaoyi-xia':   '高一下学期',
    'gaoer-shang': '高二上学期',
    'gaoer-xia':   '高二下学期',
    'gaosan-shang':'高三上学期',
    'gaosan-xia':  '高三下学期',
    'college': '大学',
    'ielts': '雅思'
  };

  // ---------- Low-level helpers ----------
  function load(key, defaultValue) {
    try {
      var raw = localStorage.getItem(KEY_PREFIX + key);
      if (raw === null || raw === undefined) {
        return defaultValue;
      }
      return JSON.parse(raw);
    } catch (err) {
      console.warn('[Storage] load failed for', key, err);
      return defaultValue;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(KEY_PREFIX + key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error('[Storage] save failed for', key, err);
      return false;
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(KEY_PREFIX + key);
    } catch (err) {
      console.warn('[Storage] remove failed for', key, err);
    }
  }

  // 导出所有本地数据(用于电脑↔手机同步)
  function exportAll() {
    var data = {
      _exportVersion: 1,
      _exportedAt: new Date().toISOString(),
      keys: {}
    };
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k) continue;
        if (k.indexOf(KEY_PREFIX) !== 0 && k !== 'vm_history_log') continue;
        var raw = localStorage.getItem(k);
        data.keys[k] = raw;
      }
    } catch (err) {
      console.error('[Storage] export failed', err);
    }
    return data;
  }

  // 导入数据(覆盖本地,用于电脑↔手机同步)
  // 模式:'merge'=只覆盖有值的,'replace'=完全替换
  function importAll(data, mode) {
    mode = mode || 'merge';
    if (!data || typeof data !== 'object' || !data.keys) {
      return { ok: false, count: 0, msg: '数据格式不对' };
    }
    var count = 0;
    var skips = 0;
    try {
      Object.keys(data.keys).forEach(function (k) {
        var raw = data.keys[k];
        if (raw == null) return;
        if (mode === 'merge') {
          if (localStorage.getItem(k) != null) { skips++; return; }
        }
        localStorage.setItem(k, String(raw));
        count++;
      });
      return { ok: true, count: count, skips: skips, msg: '已导入 ' + count + ' 项' + (skips ? '(跳过本地已有 ' + skips + ' 项)' : '') };
    } catch (err) {
      console.error('[Storage] import failed', err);
      return { ok: false, count: count, msg: '导入失败:' + (err.message || err) };
    }
  }

  // 计算需要同步的 KV 摘要(给 UI 展示)
  function summarizeExport(data) {
    if (!data || !data.keys) return '无数据';
    var groups = {};
    Object.keys(data.keys).forEach(function (k) {
      var prefix = k.replace(/^vm_/, '').split(/[_-]/)[0];
      groups[prefix] = (groups[prefix] || 0) + 1;
    });
    var parts = [];
    Object.keys(groups).forEach(function (g) {
      parts.push(g + ': ' + groups[g]);
    });
    var sizeKb = 0;
    try {
      sizeKb = Math.round(JSON.stringify(data).length / 1024 * 10) / 10;
    } catch (e) {}
    return parts.join(' · ') + ' (共 ' + sizeKb + ' KB)';
  }

  function todayStr() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  // ---------- Vocabulary ----------
  function getVocab(stage) {
    if (!stage) return null;
    return load('vocab_' + stage, null);
  }

  function saveVocab(stage, vocabObj) {
    if (!stage || !vocabObj) return false;
    return save('vocab_' + stage, vocabObj);
  }

  // ---------- Progress ----------
  function getProgress(stage) {
    var key = 'progress_' + stage;
    var stored = load(key, null);
    if (stored && stored.cards) return stored;
    return {
      cards: {},
      streak: 0,
      lastStudyDate: null,
      addedDate: todayStr()
    };
  }

  function saveProgress(stage, progress) {
    return save('progress_' + stage, progress);
  }

  function getCard(stage, wordId) {
    var prog = getProgress(stage);
    return prog.cards[wordId] || null;
  }

  function updateCard(stage, wordId, updates) {
    var prog = getProgress(stage);
    var existing = prog.cards[wordId] || {
      ef: 2.5,
      interval: 0,
      repetitions: 0,
      dueDate: todayStr(),
      lastReviewed: null,
      lapses: 0,
      addedDate: todayStr(),
      stats: { attempts: 0, correct: 0, wrong: 0, totalTime: 0 }
    };
    var merged = {
      ef: updates.ef !== undefined ? updates.ef : existing.ef,
      interval: updates.interval !== undefined ? updates.interval : existing.interval,
      repetitions: updates.repetitions !== undefined ? updates.repetitions : existing.repetitions,
      dueDate: updates.dueDate !== undefined ? updates.dueDate : existing.dueDate,
      lastReviewed: updates.lastReviewed !== undefined ? updates.lastReviewed : existing.lastReviewed,
      lapses: updates.lapses !== undefined ? updates.lapses : existing.lapses,
      addedDate: existing.addedDate,
      stats: Object.assign({}, existing.stats, updates.stats || {})
    };
    prog.cards[wordId] = merged;
    saveProgress(stage, prog);
    return merged;
  }

  function getDueCards(stage, today) {
    var day = today || todayStr();
    var prog = getProgress(stage);
    var dueIds = [];
    Object.keys(prog.cards).forEach(function (id) {
      var c = prog.cards[id];
      if (!c.dueDate || c.dueDate <= day) {
        dueIds.push(Number(id));
      }
    });
    return dueIds;
  }

  function getNewCards(stage) {
    var vocab = getVocab(stage);
    var prog = getProgress(stage);
    if (!vocab || !vocab.words) return [];
    return vocab.words.filter(function (w) {
      return !prog.cards[w.id];
    });
  }

  // ---------- Attempts log ----------
  function logAttempt(entry) {
    if (!entry || !entry.timestamp) {
      entry = entry || {};
      entry.timestamp = Date.now();
    }
    var log = load('attempts_log', []);
    log.push(entry);
    // Keep last 5000 entries to avoid unbounded growth
    if (log.length > 5000) {
      log = log.slice(log.length - 5000);
    }
    save('attempts_log', log);
    return entry;
  }

  function getAttemptsLog(range) {
    var log = load('attempts_log', []);
    if (!range || range === 'all') return log;
    var days = parseInt(range, 10);
    if (!days || isNaN(days)) return log;
    var cutoff = Date.now() - days * 86400000;
    return log.filter(function (e) {
      return e.timestamp && e.timestamp >= cutoff;
    });
  }

  // ---------- Confusion pairs ----------
  function addConfusion(a, b) {
    if (!a || !b || a === b) return;
    var pairs = load('confusion_pairs', []);
    var found = pairs.find(function (p) {
      return (p.a === a && p.b === b) || (p.a === b && p.b === a);
    });
    if (found) {
      found.count = (found.count || 0) + 1;
      found.lastAt = Date.now();
    } else {
      pairs.push({ a: a, b: b, count: 1, lastAt: Date.now() });
    }
    save('confusion_pairs', pairs);
  }

  function getConfusionPairs() {
    return load('confusion_pairs', []);
  }

  // ---------- Wrong book ----------
  function getWrongBook(stage) {
    return load('wrong_book_' + stage, []);
  }

  function addWrong(stage, wordId) {
    var book = getWrongBook(stage);
    if (book.indexOf(wordId) === -1) {
      book.push(wordId);
      save('wrong_book_' + stage, book);
    }
  }

  function removeWrong(stage, wordId) {
    var book = getWrongBook(stage).filter(function (id) {
      return id !== wordId;
    });
    save('wrong_book_' + stage, book);
  }

  // ---------- Stats ----------
  function getStats(stage, range) {
    var vocab = getVocab(stage);
    var prog = getProgress(stage);
    var totalWords = vocab && vocab.words ? vocab.words.length : 0;
    var learnedIds = Object.keys(prog.cards);
    var learnedCount = learnedIds.length;

    var masteredCount = 0;
    var totalEF = 0;
    var efCount = 0;
    learnedIds.forEach(function (id) {
      var c = prog.cards[id];
      if (c.interval >= 35) masteredCount++;
      totalEF += c.ef;
      efCount++;
    });

    var today = todayStr();
    var dueIds = getDueCards(stage, today);

    var log = getAttemptsLog(range);
    var correct = 0;
    var wrong = 0;
    var totalTime = 0;
    log.forEach(function (e) {
      if (e.stage && stage && e.stage !== stage) return;
      if (e.correct) correct++;
      else wrong++;
      if (e.timeMs) totalTime += e.timeMs;
    });

    return {
      stage: stage,
      totalWords: totalWords,
      learnedCount: learnedCount,
      masteredCount: masteredCount,
      dueCount: dueIds.length,
      newCount: totalWords - learnedCount,
      accuracy: correct + wrong > 0 ? correct / (correct + wrong) : 0,
      correctCount: correct,
      wrongCount: wrong,
      avgTimeMs: correct + wrong > 0 ? totalTime / (correct + wrong) : 0,
      avgEF: efCount > 0 ? totalEF / efCount : 2.5,
      streak: prog.streak || 0,
      lastStudyDate: prog.lastStudyDate
    };
  }

  // ---------- Streak ----------
  function bumpStreak(stage) {
    var prog = getProgress(stage);
    var today = todayStr();
    if (prog.lastStudyDate === today) {
      return prog.streak || 1;
    }
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    var yStr = yesterday.getFullYear() + '-' +
      String(yesterday.getMonth() + 1).padStart(2, '0') + '-' +
      String(yesterday.getDate()).padStart(2, '0');
    if (prog.lastStudyDate === yStr) {
      prog.streak = (prog.streak || 0) + 1;
    } else {
      prog.streak = 1;
    }
    prog.lastStudyDate = today;
    saveProgress(stage, prog);
    return prog.streak;
  }

  // ---------- Export / Import ----------
  function exportAll() {
    var dump = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      vocabs: {},
      progresses: {},
      attempts: load('attempts_log', []),
      confusion: load('confusion_pairs', []),
      wrongBooks: {},
      currentStage: load('current_stage', 'junior')
    };
    STAGES.forEach(function (s) {
      var v = getVocab(s);
      if (v) dump.vocabs[s] = v;
      dump.progresses[s] = getProgress(s);
      dump.wrongBooks[s] = getWrongBook(s);
    });
    return dump;
  }

  function importAll(json) {
    if (!json || typeof json !== 'object') return false;
    try {
      if (json.vocabs) {
        Object.keys(json.vocabs).forEach(function (s) {
          saveVocab(s, json.vocabs[s]);
        });
      }
      if (json.progresses) {
        Object.keys(json.progresses).forEach(function (s) {
          saveProgress(s, json.progresses[s]);
        });
      }
      if (json.attempts) save('attempts_log', json.attempts);
      if (json.confusion) save('confusion_pairs', json.confusion);
      if (json.wrongBooks) {
        Object.keys(json.wrongBooks).forEach(function (s) {
          save('wrong_book_' + s, json.wrongBooks[s]);
        });
      }
      if (json.currentStage) save('current_stage', json.currentStage);
      return true;
    } catch (err) {
      console.error('[Storage] import failed', err);
      return false;
    }
  }

  function getCurrentStage() {
    return load('current_stage', 'junior');
  }

  function setCurrentStage(stage) {
    save('current_stage', stage);
  }

  // ---------- Backup helpers (R10) ----------
  // Builds a single JSON object that captures all app data.
  function buildBackup() {
    var dump = exportAll();
    // Include auxiliary stores
    dump.memoryPalaces = load('memory_palaces', []);
    dump.lookupLog = load('lookup_log', []);
    dump.readingHistory = load('reading_history', []);
    dump.feynmanHistory = load('feynman_history', []);
    dump.collocationsCache = load('collocations_cache', null);
    try {
      var raw = localStorage.getItem('vm_history_log');
      dump.historyLog = raw ? JSON.parse(raw) : [];
    } catch (e) {
      dump.historyLog = [];
    }
    return dump;
  }

  // Trigger browser download of all data as a .json file.
  function downloadBackup() {
    var dump = buildBackup();
    var json = JSON.stringify(dump, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'vocabmastery-backup-' + todayStr() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    return dump;
  }

  // Parse a File and import it. Returns { ok, error? }.
  function uploadBackup(file) {
    if (!file) return { ok: false, error: '未选择文件' };
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var text = String(e.target.result || '');
          var json = JSON.parse(text);
          var ok = importAll(json);
          // Also restore auxiliary stores
          if (ok) {
            if (json.memoryPalaces) save('memory_palaces', json.memoryPalaces);
            if (json.lookupLog) save('lookup_log', json.lookupLog);
            if (json.readingHistory) save('reading_history', json.readingHistory);
            if (json.feynmanHistory) save('feynman_history', json.feynmanHistory);
            if (json.collocationsCache) save('collocations_cache', json.collocationsCache);
            if (json.historyLog) {
              try { localStorage.setItem('vm_history_log', JSON.stringify(json.historyLog)); }
              catch (e) { /* ignore quota */ }
            }
          }
          resolve(ok ? { ok: true } : { ok: false, error: '数据格式不兼容' });
        } catch (err) {
          console.error('[Storage] upload parse failed', err);
          resolve({ ok: false, error: 'JSON 解析失败' });
        }
      };
      reader.onerror = function () { resolve({ ok: false, error: '文件读取失败' }); };
      reader.readAsText(file);
    });
  }

  // ---------- Public API ----------
  global.Storage = {
    load: load,
    save: save,
    remove: remove,
    todayStr: todayStr,
    STAGES: STAGES,
    STAGE_NAMES: STAGE_NAMES,
    getVocab: getVocab,
    saveVocab: saveVocab,
    getProgress: getProgress,
    saveProgress: saveProgress,
    getCard: getCard,
    updateCard: updateCard,
    getDueCards: getDueCards,
    getNewCards: getNewCards,
    logAttempt: logAttempt,
    getAttemptsLog: getAttemptsLog,
    addConfusion: addConfusion,
    getConfusionPairs: getConfusionPairs,
    getWrongBook: getWrongBook,
    addWrong: addWrong,
    removeWrong: removeWrong,
    getStats: getStats,
    bumpStreak: bumpStreak,
    exportAll: exportAll,
    importAll: importAll,
    summarizeExport: summarizeExport,
    getCurrentStage: getCurrentStage,
    setCurrentStage: setCurrentStage,
    buildBackup: buildBackup,
    downloadBackup: downloadBackup,
    uploadBackup: uploadBackup
  };
})(window);