(function (global) {
  'use strict';

  var CACHE_KEY = 'vm_wrongbook_cache';
  var META_KEY = 'vm_wrong_meta';

  function loadCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function saveCache(items) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        at: Date.now(),
        items: items
      }));
    } catch (e) {}
  }

  function loadMeta() {
    try {
      var raw = localStorage.getItem(META_KEY);
      if (!raw) return { frequency: {}, lastAt: {}, cleared: {} };
      var obj = JSON.parse(raw);
      if (!obj.cleared) obj.cleared = {};
      return obj;
    } catch (err) {
      return { frequency: {}, lastAt: {}, cleared: {} };
    }
  }

  function saveMeta(meta) {
    try {
      localStorage.setItem(META_KEY, JSON.stringify(meta));
    } catch (err) {}
  }

  function bumpMeta(stage, wordId) {
    var meta = loadMeta();
    var key = stage + ':' + wordId;
    meta.frequency[key] = (meta.frequency[key] || 0) + 1;
    meta.lastAt[key] = Date.now();
    saveMeta(meta);
  }

  function markCleared(stage, wordId) {
    var meta = loadMeta();
    var key = stage + ':' + wordId;
    if (!meta.cleared[stage]) meta.cleared[stage] = {};
    meta.cleared[stage][wordId] = {
      clearedAt: Date.now(),
      frequency: meta.frequency[key] || 0
    };
    saveMeta(meta);
  }

  function getClearedIds(stage) {
    var meta = loadMeta();
    var bucket = (meta.cleared && meta.cleared[stage]) || {};
    return Object.keys(bucket);
  }

  function joinWithVocab(items, stage) {
    var vocab = Storage.getVocab(stage);
    return (items || []).map(function (it) {
      var w = vocab && vocab.words ? vocab.words.find(function (x) { return x.id === it.word_id; }) : null;
      return {
        wordId: it.word_id,
        word: w ? w.word : ('#' + it.word_id),
        translation: w ? (w.translation || '') : '',
        phonetic: w ? (w.phonetic || '') : '',
        frequency: it.wrong_count || 1,
        lastAt: it.latest_at ? new Date(it.latest_at).getTime() : Date.now(),
        source: it.source || 'test',
        sourceId: it.source_id || null
      };
    });
  }

  function getAll(stage) {
    var cache = loadCache();
    var items = cache ? (cache.items || []) : [];
    return joinWithVocab(items, stage);
  }

  function getAllFresh(stage) {
    if (!global.BackendSync) return Promise.resolve(getAll(stage));
    return BackendSync.WrongBook.list().then(function (rows) {
      if (!Array.isArray(rows)) return getAll(stage);
      // 关键修复:不直接用后端返回覆盖本地缓存,而是合并
      // 原因:刚答错的词可能本地已加但还没推上去,后端拉回来会把本地的增量覆盖掉
      var localCache = loadCache();
      var localItems = (localCache && Array.isArray(localCache.items)) ? localCache.items : [];
      var byId = {};
      rows.forEach(function (r) {
        if (r && r.word_id !== undefined) byId[r.word_id] = Object.assign({}, r);
      });
      // 本地有但后端没有的项(刚加的),保留并累加错次
      localItems.forEach(function (lit) {
        if (lit && lit.word_id !== undefined) {
          if (byId[lit.word_id]) {
            // 都有,取较大的错次
            byId[lit.word_id].wrong_count = Math.max(
              byId[lit.word_id].wrong_count || 0,
              lit.wrong_count || 0
            );
            // 保留较新的时间
            var localTs = lit.latest_at ? new Date(lit.latest_at).getTime() : 0;
            var serverTs = byId[lit.word_id].latest_at ? new Date(byId[lit.word_id].latest_at).getTime() : 0;
            if (localTs > serverTs) byId[lit.word_id].latest_at = lit.latest_at;
          } else {
            byId[lit.word_id] = Object.assign({}, lit);
          }
        }
      });
      var merged = Object.keys(byId).map(function (k) { return byId[k]; });
      saveCache(merged);
      return joinWithVocab(merged, stage);
    });
  }

  function add(stage, wordId) {
    if (Storage.addWrong) Storage.addWrong(stage, wordId);
    bumpMeta(stage, wordId);
    if (Storage.getCard && Storage.updateCard) {
      var card = Storage.getCard(stage, wordId);
      if (card) {
        var next = Object.assign({}, card, {
          lapses: (card.lapses || 0) + 1,
          interval: 1,
          dueDate: window.SRS && SRS.addDays ? SRS.addDays(Storage.todayStr(), 1) : Storage.todayStr()
        });
        Storage.updateCard(stage, wordId, next);
      }
    }
    // 同步更新本地缓存,使未登录/后端不可用时错题本也能立刻看到
    try {
      var cache = loadCache();
      var items = (cache && Array.isArray(cache.items)) ? cache.items : [];
      var exists = items.find(function (it) { return it.word_id === wordId; });
      if (exists) {
        exists.wrong_count = (exists.wrong_count || 0) + 1;
        exists.latest_at = new Date().toISOString();
      } else {
        items.push({
          word_id: wordId,
          wrong_count: 1,
          latest_at: new Date().toISOString(),
          source: 'test',
          source_id: null
        });
      }
      saveCache(items);
    } catch (e) {}
  }

  function remove(stage, wordId) {
    markCleared(stage, wordId);
    if (Storage.removeWrong) Storage.removeWrong(stage, wordId);
    if (global.BackendSync) {
      BackendSync.WrongBook.markResolved(wordId).catch(function () {});
    }
    var cache = loadCache();
    if (cache && cache.items) {
      cache.items = cache.items.filter(function (it) { return it.word_id !== wordId; });
      saveCache(cache.items);
    } else {
      saveCache([]);
    }
  }

  function isInBook(stage, wordId) {
    var cache = loadCache();
    if (cache && Array.isArray(cache.items)) {
      return cache.items.some(function (it) { return it.word_id !== undefined && it.word_id === wordId; });
    }
    var book = Storage.getWrongBook(stage) || [];
    return book.indexOf(wordId) !== -1;
  }

  function getStats(stage) {
    var items = getAll(stage);
    var totalErrors = items.reduce(function (s, w) { return s + (w.frequency || 0); }, 0);
    return {
      stage: stage,
      total: items.length,
      uniqueWords: items.length,
      totalErrors: totalErrors,
      topFrequent: items.slice().sort(function (a, b) { return b.frequency - a.frequency; }).slice(0, 10)
    };
  }

  function getMostFrequent(stage, n) {
    n = n || 10;
    return getStats(stage).topFrequent.slice(0, n);
  }

  function clear(stage) {
    var items = getAll(stage);
    items.forEach(function (it) {
      markCleared(stage, it.wordId);
      if (Storage.removeWrong) Storage.removeWrong(stage, it.wordId);
    });
    if (global.BackendSync) {
      items.forEach(function (it) {
        BackendSync.WrongBook.markResolved(it.wordId).catch(function () {});
      });
    }
    saveCache([]);
  }

  global.WrongBook = {
    getAll: getAll,
    getAllFresh: getAllFresh,
    add: add,
    remove: remove,
    isInBook: isInBook,
    getStats: getStats,
    getMostFrequent: getMostFrequent,
    getClearedIds: getClearedIds,
    clear: clear
  };
})(window);
