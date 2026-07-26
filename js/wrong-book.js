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
      saveCache(rows);
      return joinWithVocab(rows, stage);
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
