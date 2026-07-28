(function (global) {
  'use strict';

  var FLAG_KEY = 'vm_migrated_v1';

  function isMigrated() {
    try { return localStorage.getItem(FLAG_KEY) === '1'; }
    catch (e) { return false; }
  }

  function markMigrated() {
    try { localStorage.setItem(FLAG_KEY, '1'); } catch (e) {}
  }

  function collectLocalProgress() {
    var out = [];
    var STAGES = global.Storage && Storage.STAGES ? Storage.STAGES : [];
    STAGES.forEach(function (stage) {
      var raw;
      try { raw = localStorage.getItem('vm_progress_' + stage); }
      catch (e) { return; }
      if (!raw) return;
      try {
        var p = JSON.parse(raw);
        var cards = p.cards || {};
        Object.keys(cards).forEach(function (wordId) {
          var c = cards[wordId];
          out.push({
            stage: stage,
            word_id: parseInt(wordId, 10),
            ef: typeof c.ef === 'number' ? c.ef : 2.5,
            interval_days: c.interval || 0,
            repetitions: c.repetitions || 0,
            due_date: c.dueDate || c.due_date || null,
            last_reviewed: c.lastReviewed || c.last_reviewed || null,
            lapses: c.lapses || 0,
            stats: c.stats || {}
          });
        });
      } catch (e) {}
    });
    return out;
  }

  function collectLocalWrong() {
    var out = [];
    var STAGES = global.Storage && Storage.STAGES ? Storage.STAGES : [];
    STAGES.forEach(function (stage) {
      var raw;
      try { raw = localStorage.getItem('vm_wrong_book_' + stage); }
      catch (e) { return; }
      if (!raw) return;
      try {
        var arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return;
        arr.forEach(function (wordId) {
          out.push({
            stage: stage,
            word_id: parseInt(wordId, 10),
            wrong_count: 1,
            latest_at: new Date().toISOString(),
            resolved: false,
            source: 'migration'
          });
        });
      } catch (e) {}
    });
    return out;
  }

  function collectLocalAttempts() {
    try {
      var raw = localStorage.getItem('vm_attempts_log');
      if (!raw) return [];
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.slice(-2000).map(function (e) {
        return {
          stage: e.stage || 'junior',
          word_id: e.wordId || e.word_id,
          mode: e.mode || 'unknown',
          correct: !!e.correct,
          time_ms: e.timeMs || e.time_ms || 0
        };
      }).filter(function (r) { return r.word_id; });
    } catch (e) { return []; }
  }

  function chunk(arr, size) {
    var out = [];
    for (var i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  function run() {
    if (isMigrated()) return Promise.resolve({ skipped: true });
    if (!global.BackendSync) return Promise.resolve({ skipped: 'no backend' });

    var progressRows = collectLocalProgress();
    var wrongRows = collectLocalWrong();
    var attempts = collectLocalAttempts();

    var tasks = [];
    if (progressRows.length) {
      chunk(progressRows, 200).forEach(function (batch) {
        tasks.push(BackendSync.Progress.upsertBatch(batch).then(function () {
          console.info('[Migration] progress +' + batch.length);
        }));
      });
    }
    if (wrongRows.length) {
      tasks.push(chunk(wrongRows, 200).reduce(function (p, batch) {
        return p.then(function () {
          return ApiClient.post('/api/wrongbook-v2', { rows: batch });
        }).then(function () { console.info('[Migration] wrong +' + batch.length); });
      }, Promise.resolve()));
    }
    if (attempts.length) {
      chunk(attempts, 200).forEach(function (batch) {
        tasks.push(BackendSync.Attempts.recordBatch(batch).then(function () {
          console.info('[Migration] attempts +' + batch.length);
        }));
      });
    }

    if (tasks.length === 0) {
      markMigrated();
      return Promise.resolve({ skipped: 'no data' });
    }

    return Promise.all(tasks).then(function () {
      markMigrated();
      console.info('[Migration] done: progress=' + progressRows.length +
        ' wrong=' + wrongRows.length + ' attempts=' + attempts.length);
      return { progress: progressRows.length, wrong: wrongRows.length, attempts: attempts.length };
    }).catch(function (e) {
      console.error('[Migration] failed:', e);
      throw e;
    });
  }

  global.Migration = {
    run: run,
    isMigrated: isMigrated,
    markMigrated: markMigrated
  };
})(window);
